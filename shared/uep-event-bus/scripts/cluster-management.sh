#!/bin/bash

# UEP Message Broker - NATS JetStream Cluster Management Scripts
#
# This script provides comprehensive management capabilities for the NATS JetStream
# cluster, including health checks, maintenance operations, and troubleshooting.

set -euo pipefail

# Configuration
NATS_SERVERS=("nats-1:4222" "nats-2:4222" "nats-3:4222")
NATS_LB="nats-lb:4222"
PROMETHEUS_URL="http://prometheus:9090"
GRAFANA_URL="http://grafana:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Health check functions
check_nats_server() {
    local server=$1
    info "Checking NATS server: $server"
    
    if nats server check --server=$server; then
        log "✅ $server is healthy"
        return 0
    else
        error "❌ $server is unhealthy"
        return 1
    fi
}

check_cluster_health() {
    log "Checking NATS cluster health..."
    
    local healthy_servers=0
    local total_servers=${#NATS_SERVERS[@]}
    
    for server in "${NATS_SERVERS[@]}"; do
        if check_nats_server "$server"; then
            ((healthy_servers++))
        fi
    done
    
    if [ $healthy_servers -eq $total_servers ]; then
        log "🎉 All $total_servers servers are healthy"
        return 0
    elif [ $healthy_servers -gt $((total_servers / 2)) ]; then
        warn "⚠️  $healthy_servers/$total_servers servers are healthy (quorum maintained)"
        return 1
    else
        error "💥 Only $healthy_servers/$total_servers servers are healthy (quorum lost)"
        return 2
    fi
}

check_jetstream_health() {
    log "Checking JetStream health..."
    
    for server in "${NATS_SERVERS[@]}"; do
        info "Checking JetStream on $server"
        
        if nats stream ls --server=$server > /dev/null 2>&1; then
            log "✅ JetStream is healthy on $server"
        else
            error "❌ JetStream is unhealthy on $server"
        fi
    done
}

# Stream management functions
list_streams() {
    log "Listing JetStream streams..."
    nats stream ls --server=$NATS_LB
}

create_stream() {
    local stream_name=$1
    local subjects=$2
    local retention=${3:-limits}
    
    log "Creating stream: $stream_name"
    nats stream add $stream_name \
        --subjects="$subjects" \
        --retention=$retention \
        --server=$NATS_LB
}

delete_stream() {
    local stream_name=$1
    warn "Deleting stream: $stream_name"
    
    read -p "Are you sure you want to delete stream '$stream_name'? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nats stream rm $stream_name --force --server=$NATS_LB
        log "Stream $stream_name deleted"
    else
        log "Stream deletion cancelled"
    fi
}

stream_info() {
    local stream_name=$1
    log "Getting stream info: $stream_name"
    nats stream info $stream_name --server=$NATS_LB
}

# Consumer management functions
list_consumers() {
    local stream_name=$1
    log "Listing consumers for stream: $stream_name"
    nats consumer ls $stream_name --server=$NATS_LB
}

create_consumer() {
    local stream_name=$1
    local consumer_name=$2
    local filter_subject=${3:-""}
    
    log "Creating consumer: $consumer_name for stream: $stream_name"
    
    local cmd="nats consumer add $stream_name $consumer_name --server=$NATS_LB"
    if [ -n "$filter_subject" ]; then
        cmd="$cmd --filter-subject=$filter_subject"
    fi
    
    eval $cmd
}

consumer_info() {
    local stream_name=$1
    local consumer_name=$2
    log "Getting consumer info: $consumer_name in stream: $stream_name"
    nats consumer info $stream_name $consumer_name --server=$NATS_LB
}

# Message operations
publish_test_message() {
    local subject=$1
    local message=${2:-"Test message from cluster management script"}
    
    log "Publishing test message to subject: $subject"
    echo "$message" | nats pub $subject --server=$NATS_LB
}

subscribe_test() {
    local subject=$1
    local timeout=${2:-10}
    
    log "Subscribing to subject: $subject for $timeout seconds"
    timeout $timeout nats sub $subject --server=$NATS_LB || true
}

# Performance testing
performance_test() {
    local subject=${1:-"uep.test.performance"}
    local messages=${2:-1000}
    local size=${3:-1024}
    
    log "Running performance test: $messages messages of $size bytes"
    
    # Start subscriber in background
    nats sub $subject --count=$messages --server=$NATS_LB > /tmp/nats_sub_output.log &
    local sub_pid=$!
    
    sleep 2
    
    # Publish messages
    log "Publishing $messages messages..."
    nats pub $subject --count=$messages --size=$size --server=$NATS_LB
    
    # Wait for subscriber to complete
    wait $sub_pid
    
    log "Performance test completed. Check /tmp/nats_sub_output.log for results"
}

# Backup and restore functions
backup_streams() {
    local backup_dir=${1:-"/backups/nats-$(date +%Y%m%d-%H%M%S)"}
    
    log "Creating backup directory: $backup_dir"
    mkdir -p "$backup_dir"
    
    # Get list of streams
    local streams=($(nats stream ls --server=$NATS_LB | tail -n +3))
    
    for stream in "${streams[@]}"; do
        if [ -n "$stream" ]; then
            log "Backing up stream: $stream"
            nats stream backup $stream "$backup_dir/$stream.backup" --server=$NATS_LB
        fi
    done
    
    log "Backup completed: $backup_dir"
}

restore_streams() {
    local backup_dir=$1
    
    if [ ! -d "$backup_dir" ]; then
        error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    log "Restoring streams from: $backup_dir"
    
    for backup_file in "$backup_dir"/*.backup; do
        if [ -f "$backup_file" ]; then
            local stream_name=$(basename "$backup_file" .backup)
            log "Restoring stream: $stream_name"
            nats stream restore "$backup_file" --server=$NATS_LB
        fi
    done
    
    log "Restore completed"
}

# Monitoring and metrics
show_cluster_stats() {
    log "NATS Cluster Statistics:"
    
    for server in "${NATS_SERVERS[@]}"; do
        info "Server: $server"
        echo "----------------------------------------"
        
        # Server info
        nats server info --server=$server || warn "Could not get info for $server"
        echo
        
        # Connection count
        local conn_count=$(nats server list --server=$server 2>/dev/null | grep -c "Client" || echo "0")
        echo "Active Connections: $conn_count"
        echo
    done
}

monitor_performance() {
    local duration=${1:-60}
    local interval=${2:-5}
    
    log "Monitoring cluster performance for $duration seconds (interval: ${interval}s)"
    
    local end_time=$(($(date +%s) + duration))
    
    while [ $(date +%s) -lt $end_time ]; do
        echo "$(date): Checking performance..."
        
        # Get message rates
        for server in "${NATS_SERVERS[@]}"; do
            local stats=$(nats server info --server=$server 2>/dev/null | grep -E "(in_msgs|out_msgs|in_bytes|out_bytes)" || echo "Unable to get stats")
            echo "$server: $stats"
        done
        
        echo "---"
        sleep $interval
    done
    
    log "Performance monitoring completed"
}

# Maintenance functions
rolling_restart() {
    warn "Performing rolling restart of NATS cluster..."
    
    for server in "${NATS_SERVERS[@]}"; do
        local container_name="uep-$(echo $server | cut -d: -f1)"
        
        log "Restarting $container_name..."
        docker restart $container_name
        
        # Wait for server to be healthy
        local retries=0
        while [ $retries -lt 30 ]; do
            if check_nats_server "$server" > /dev/null 2>&1; then
                log "$container_name is healthy after restart"
                break
            fi
            sleep 2
            ((retries++))
        done
        
        if [ $retries -eq 30 ]; then
            error "$container_name failed to become healthy after restart"
            return 1
        fi
        
        # Wait a bit before restarting next server
        sleep 10
    done
    
    log "Rolling restart completed successfully"
}

cleanup_old_data() {
    local days=${1:-7}
    
    warn "Cleaning up data older than $days days..."
    
    # This would typically involve purging old messages from streams
    # Implementation depends on specific retention policies
    
    for server in "${NATS_SERVERS[@]}"; do
        info "Cleaning up $server..."
        # Add specific cleanup commands here
        echo "Would clean up data older than $days days on $server"
    done
    
    log "Cleanup completed"
}

# Troubleshooting functions
diagnose_connectivity() {
    log "Diagnosing connectivity issues..."
    
    # Test each server individually
    for server in "${NATS_SERVERS[@]}"; do
        info "Testing connectivity to $server"
        
        # Basic network connectivity
        if nc -z ${server/:/ } 2>/dev/null; then
            log "✅ Network connectivity to $server: OK"
        else
            error "❌ Network connectivity to $server: FAILED"
        fi
        
        # NATS protocol test
        if nats server ping --server=$server > /dev/null 2>&1; then
            log "✅ NATS protocol to $server: OK"
        else
            error "❌ NATS protocol to $server: FAILED"
        fi
    done
    
    # Test load balancer
    info "Testing load balancer: $NATS_LB"
    if nats server ping --server=$NATS_LB > /dev/null 2>&1; then
        log "✅ Load balancer: OK"
    else
        error "❌ Load balancer: FAILED"
    fi
}

check_resource_usage() {
    log "Checking resource usage..."
    
    # Get container stats
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep uep-nats
}

# Main function
main() {
    case "${1:-help}" in
        "health")
            check_cluster_health
            check_jetstream_health
            ;;
        "streams")
            case "${2:-list}" in
                "list") list_streams ;;
                "create") create_stream "$3" "$4" "${5:-limits}" ;;
                "delete") delete_stream "$3" ;;
                "info") stream_info "$3" ;;
                *) error "Unknown stream command: $2" ;;
            esac
            ;;
        "consumers")
            case "${2:-list}" in
                "list") list_consumers "$3" ;;
                "create") create_consumer "$3" "$4" "${5:-}" ;;
                "info") consumer_info "$3" "$4" ;;
                *) error "Unknown consumer command: $2" ;;
            esac
            ;;
        "test")
            case "${2:-pub}" in
                "pub") publish_test_message "$3" "${4:-}" ;;
                "sub") subscribe_test "$3" "${4:-10}" ;;
                "perf") performance_test "${3:-}" "${4:-1000}" "${5:-1024}" ;;
                *) error "Unknown test command: $2" ;;
            esac
            ;;
        "backup")
            backup_streams "${2:-}"
            ;;
        "restore")
            restore_streams "$2"
            ;;
        "stats")
            show_cluster_stats
            ;;
        "monitor")
            monitor_performance "${2:-60}" "${3:-5}"
            ;;
        "restart")
            rolling_restart
            ;;
        "cleanup")
            cleanup_old_data "${2:-7}"
            ;;
        "diagnose")
            diagnose_connectivity
            check_resource_usage
            ;;
        "help"|*)
            echo "UEP Message Broker - NATS Cluster Management"
            echo "Usage: $0 <command> [options]"
            echo
            echo "Commands:"
            echo "  health                          - Check cluster health"
            echo "  streams list                    - List all streams"
            echo "  streams create <name> <subj>    - Create stream"
            echo "  streams delete <name>           - Delete stream"
            echo "  streams info <name>             - Show stream info"
            echo "  consumers list <stream>         - List consumers"
            echo "  consumers create <s> <c> [f]    - Create consumer"
            echo "  consumers info <stream> <cons>  - Show consumer info"
            echo "  test pub <subject> [message]    - Publish test message"
            echo "  test sub <subject> [timeout]    - Subscribe to messages"
            echo "  test perf [subj] [msgs] [size]  - Performance test"
            echo "  backup [directory]              - Backup all streams"
            echo "  restore <directory>             - Restore from backup"
            echo "  stats                           - Show cluster statistics"
            echo "  monitor [duration] [interval]   - Monitor performance"
            echo "  restart                         - Rolling restart"
            echo "  cleanup [days]                  - Cleanup old data"
            echo "  diagnose                        - Troubleshoot issues"
            echo "  help                            - Show this help"
            ;;
    esac
}

# Run main function with all arguments
main "$@"