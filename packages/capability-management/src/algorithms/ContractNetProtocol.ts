#!/usr/bin/env node

/**
 * UEP Contract Net Protocol Implementation
 * 
 * Contract Net Protocol (CNP) implementation for agent negotiation in UEP system.
 * Enables distributed negotiation for capability allocation with bidding,
 * evaluation, and contract awarding mechanisms.
 * 
 * Research-based implementation features:
 * - Standard Contract Net Protocol with bid/award cycles
 * - Multi-round negotiation with iterative improvement
 * - Timeout and failure handling mechanisms
 * - Negotiation history and analytics
 * - Performance-based bid evaluation
 * - Fallback and escalation strategies
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.4
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import {
  CapabilityRequirement,
  AgentCapability
} from '../types/CapabilitySchema.js';

/**
 * Contract Net Protocol message types
 */
export type CNPMessageType = 
  | 'call-for-proposals'  // Manager broadcasts task
  | 'proposal'           // Contractor submits bid
  | 'reject-proposal'    // Manager rejects bid
  | 'accept-proposal'    // Manager accepts bid and awards contract
  | 'failure'           // Contractor reports inability to complete
  | 'cancel'            // Manager cancels the negotiation
  | 'result';           // Contractor delivers results

/**
 * CNP message structure
 */
export interface CNPMessage {
  id: string;                               // Message ID
  type: CNPMessageType;                     // Message type
  sender: string;                           // Sender agent ID
  recipient: string | 'broadcast';          // Recipient (or broadcast)
  taskId: string;                           // Task/negotiation ID
  timestamp: Date;                          // Message timestamp
  data: any;                                // Message payload
  deadline?: Date;                          // Response deadline
  correlationId?: string;                   // For message correlation
}

/**
 * Call for proposals (CFP) data
 */
export interface CallForProposals {
  taskDescription: string;                  // Task description
  requirement: CapabilityRequirement;       // Capability requirement
  constraints: Record<string, any>;         // Task constraints
  budget?: number;                          // Budget limit
  deadline: Date;                           // Task deadline
  proposalDeadline: Date;                   // Proposal submission deadline
  evaluationCriteria: {                     // Evaluation criteria
    price: number;                          // Weight for price (0-1)
    quality: number;                        // Weight for quality (0-1)
    delivery: number;                       // Weight for delivery time (0-1)
    reliability: number;                    // Weight for reliability (0-1)
  };
  preferredAgents?: string[];               // Preferred agent IDs
  blacklistedAgents?: string[];             // Blacklisted agent IDs
}

/**
 * Proposal (bid) data
 */
export interface Proposal {
  bidId: string;                            // Unique bid ID
  price: number;                            // Bid price/cost
  estimatedCompletionTime: Date;            // Estimated completion time
  qualityGuarantee: number;                 // Quality guarantee (0-1)
  reliabilityScore: number;                 // Reliability score (0-1)
  terms: Record<string, any>;               // Additional terms
  capability: AgentCapability;              // Advertised capability
  agentExperience: {                        // Agent experience metrics
    totalTasks: number;                     // Total tasks completed
    successRate: number;                    // Success rate (0-1)
    averageRating: number;                  // Average rating (0-5)
    lastActivity: Date;                     // Last activity date
  };
  constraints: {                            // Proposal constraints
    dependencies?: string[];                // Required dependencies
    exclusiveAccess?: boolean;              // Requires exclusive access
    minDuration?: number;                   // Minimum task duration
    maxConcurrency?: number;                // Max concurrent tasks
  };
}

/**
 * Contract award data
 */
export interface ContractAward {
  contractId: string;                       // Unique contract ID
  winningBid: Proposal;                     // Winning proposal
  agreedTerms: Record<string, any>;         // Final agreed terms
  deliverables: string[];                   // Expected deliverables
  milestones?: {                            // Contract milestones
    id: string;
    description: string;
    deadline: Date;
    payment: number;
  }[];
  penalties: {                              // Penalty clauses
    lateDelivery: number;                   // Late delivery penalty
    qualityBreach: number;                  // Quality breach penalty
    cancellation: number;                   // Cancellation penalty
  };
}

/**
 * Negotiation round data
 */
export interface NegotiationRound {
  roundNumber: number;                      // Round number (1-based)
  cfp: CallForProposals;                    // Call for proposals
  proposals: Map<string, Proposal>;         // Received proposals
  evaluations: Map<string, ProposalEvaluation>; // Proposal evaluations
  rejections: Map<string, string>;          // Rejected proposals with reasons
  winner?: string;                          // Winning agent ID
  award?: ContractAward;                    // Contract award
  startTime: Date;                          // Round start time
  endTime?: Date;                           // Round end time
}

/**
 * Proposal evaluation result
 */
export interface ProposalEvaluation {
  bidId: string;                            // Bid ID being evaluated
  scores: {                                 // Individual scores
    price: number;                          // Price score (0-1)
    quality: number;                        // Quality score (0-1)
    delivery: number;                       // Delivery score (0-1)
    reliability: number;                    // Reliability score (0-1)
  };
  weightedScore: number;                    // Overall weighted score (0-1)
  ranking: number;                          // Ranking among proposals
  feedback: string[];                       // Evaluation feedback
  recommended: boolean;                     // Is this proposal recommended
}

/**
 * Negotiation session state
 */
export interface NegotiationSession {
  sessionId: string;                        // Unique session ID
  managerId: string;                        // Task manager (initiator) ID
  taskId: string;                           // Associated task ID
  requirement: CapabilityRequirement;       // Capability requirement
  status: 'active' | 'completed' | 'cancelled' | 'failed'; // Session status
  rounds: NegotiationRound[];               // Negotiation rounds
  participants: Set<string>;                // Participating agent IDs
  blacklist: Set<string>;                   // Blacklisted agent IDs
  startTime: Date;                          // Session start time
  endTime?: Date;                           // Session end time
  finalContract?: ContractAward;            // Final awarded contract
  metrics: {                                // Session metrics
    totalProposals: number;                 // Total proposals received
    averageResponseTime: number;            // Average response time
    participationRate: number;              // Participation rate
    negotiationEfficiency: number;          // Efficiency score
  };
}

/**
 * Contract Net Protocol Manager
 */
export class ContractNetProtocol extends EventEmitter {
  private sessions: Map<string, NegotiationSession> = new Map();
  private messageHistory: Map<string, CNPMessage[]> = new Map();
  private agentCapabilities: Map<string, AgentCapability[]> = new Map();
  private agentPerformance: Map<string, any> = new Map();
  private defaultTimeout: number = 30000; // 30 seconds
  private maxRounds: number = 3;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Initiate a new negotiation session
   */
  public async initiateNegotiation(
    managerId: string,
    taskId: string,
    requirement: CapabilityRequirement,
    cfpData: Partial<CallForProposals> = {}
  ): Promise<string> {
    const sessionId = uuidv4();
    
    console.log(chalk.blue(`🤝 Initiating CNP negotiation: ${sessionId}`));
    
    // Create call for proposals
    const cfp: CallForProposals = {
      taskDescription: `Task requiring capability: ${requirement.capabilityId}`,
      requirement,
      constraints: {},
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
      proposalDeadline: new Date(Date.now() + this.defaultTimeout),
      evaluationCriteria: {
        price: 0.3,
        quality: 0.3,
        delivery: 0.2,
        reliability: 0.2
      },
      ...cfpData
    };
    
    // Create negotiation session
    const session: NegotiationSession = {
      sessionId,
      managerId,
      taskId,
      requirement,
      status: 'active',
      rounds: [],
      participants: new Set(),
      blacklist: new Set(cfp.blacklistedAgents || []),
      startTime: new Date(),
      metrics: {
        totalProposals: 0,
        averageResponseTime: 0,
        participationRate: 0,
        negotiationEfficiency: 0
      }
    };
    
    this.sessions.set(sessionId, session);
    this.messageHistory.set(sessionId, []);
    
    // Start first negotiation round
    await this.startNegotiationRound(sessionId, cfp);
    
    this.emit('negotiationInitiated', { sessionId, session });
    
    return sessionId;
  }

  /**
   * Start a negotiation round
   */
  private async startNegotiationRound(
    sessionId: string,
    cfp: CallForProposals
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Negotiation session not found: ${sessionId}`);
    }
    
    const roundNumber = session.rounds.length + 1;
    
    console.log(chalk.cyan(`📢 Starting negotiation round ${roundNumber} for session: ${sessionId}`));
    
    const round: NegotiationRound = {
      roundNumber,
      cfp,
      proposals: new Map(),
      evaluations: new Map(),
      rejections: new Map(),
      startTime: new Date()
    };
    
    session.rounds.push(round);
    
    // Broadcast call for proposals
    await this.broadcastCallForProposals(sessionId, cfp);
    
    // Set timeout for proposal collection
    setTimeout(() => {
      this.evaluateProposals(sessionId, roundNumber).catch(console.error);
    }, cfp.proposalDeadline.getTime() - Date.now());
    
    this.emit('roundStarted', { sessionId, roundNumber, cfp });
  }

  /**
   * Broadcast call for proposals to potential contractors
   */
  private async broadcastCallForProposals(
    sessionId: string,
    cfp: CallForProposals
  ): Promise<void> {
    const message: CNPMessage = {
      id: uuidv4(),
      type: 'call-for-proposals',
      sender: 'cnp-manager',
      recipient: 'broadcast',
      taskId: sessionId,
      timestamp: new Date(),
      data: cfp,
      deadline: cfp.proposalDeadline
    };
    
    this.recordMessage(sessionId, message);
    
    // In a real implementation, this would broadcast to all available agents
    // For simulation, we'll emit an event that agents can listen to
    this.emit('callForProposals', { sessionId, cfp, message });
    
    console.log(chalk.green(`📡 Broadcasted CFP for session: ${sessionId}`));
  }

  /**
   * Submit a proposal from a contractor agent
   */
  public async submitProposal(
    sessionId: string,
    agentId: string,
    proposal: Proposal
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      console.warn(chalk.yellow(`⚠️ Cannot submit proposal: Invalid session ${sessionId}`));
      return false;
    }
    
    const currentRound = session.rounds[session.rounds.length - 1];
    if (!currentRound) {
      console.warn(chalk.yellow(`⚠️ Cannot submit proposal: No active round for session ${sessionId}`));
      return false;
    }
    
    // Check if proposal deadline has passed
    if (new Date() > currentRound.cfp.proposalDeadline) {
      console.warn(chalk.yellow(`⚠️ Cannot submit proposal: Deadline passed for session ${sessionId}`));
      return false;
    }
    
    // Check if agent is blacklisted
    if (session.blacklist.has(agentId)) {
      console.warn(chalk.yellow(`⚠️ Cannot submit proposal: Agent ${agentId} is blacklisted`));
      return false;
    }
    
    console.log(chalk.blue(`📝 Received proposal from agent ${agentId} for session: ${sessionId}`));
    
    // Record the proposal
    currentRound.proposals.set(agentId, proposal);
    session.participants.add(agentId);
    session.metrics.totalProposals++;
    
    // Create proposal message
    const message: CNPMessage = {
      id: uuidv4(),
      type: 'proposal',
      sender: agentId,
      recipient: session.managerId,
      taskId: sessionId,
      timestamp: new Date(),
      data: proposal
    };
    
    this.recordMessage(sessionId, message);
    
    this.emit('proposalReceived', { sessionId, agentId, proposal });
    
    return true;
  }

  /**
   * Evaluate proposals and select winner or start next round
   */
  private async evaluateProposals(
    sessionId: string,
    roundNumber: number
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const round = session.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) return;
    
    console.log(chalk.blue(`🔍 Evaluating ${round.proposals.size} proposals for session: ${sessionId}`));
    
    round.endTime = new Date();
    
    if (round.proposals.size === 0) {
      console.log(chalk.yellow(`⚠️ No proposals received for session: ${sessionId}`));
      await this.handleNoProposals(sessionId);
      return;
    }
    
    // Evaluate each proposal
    const evaluations: ProposalEvaluation[] = [];
    
    for (const [agentId, proposal] of round.proposals) {
      const evaluation = this.evaluateProposal(proposal, round.cfp);
      round.evaluations.set(agentId, evaluation);
      evaluations.push(evaluation);
    }
    
    // Sort evaluations by weighted score (descending)
    evaluations.sort((a, b) => b.weightedScore - a.weightedScore);
    
    // Update rankings
    evaluations.forEach((evaluation, index) => {
      evaluation.ranking = index + 1;
    });
    
    // Check if we have a clear winner
    const topEvaluation = evaluations[0];
    const acceptableThreshold = 0.7;
    
    if (topEvaluation.weightedScore >= acceptableThreshold) {
      // Award contract to the best proposal
      const winnerAgentId = Array.from(round.proposals.entries())
        .find(([_, proposal]) => proposal.bidId === topEvaluation.bidId)?.[0];
      
      if (winnerAgentId) {
        await this.awardContract(sessionId, winnerAgentId, round.proposals.get(winnerAgentId)!);
      }
    } else if (session.rounds.length < this.maxRounds) {
      // Start another round with updated requirements
      await this.startNextRound(sessionId, evaluations);
    } else {
      // No acceptable proposals after max rounds
      await this.handleNegotiationFailure(sessionId, 'No acceptable proposals received');
    }
    
    this.emit('proposalsEvaluated', { sessionId, roundNumber, evaluations });
  }

  /**
   * Evaluate a single proposal
   */
  private evaluateProposal(
    proposal: Proposal,
    cfp: CallForProposals
  ): ProposalEvaluation {
    const scores = {
      price: this.evaluatePriceScore(proposal.price, cfp.budget),
      quality: this.evaluateQualityScore(proposal.qualityGuarantee),
      delivery: this.evaluateDeliveryScore(proposal.estimatedCompletionTime, cfp.deadline),
      reliability: this.evaluateReliabilityScore(proposal.reliabilityScore, proposal.agentExperience)
    };
    
    const weightedScore = (
      scores.price * cfp.evaluationCriteria.price +
      scores.quality * cfp.evaluationCriteria.quality +
      scores.delivery * cfp.evaluationCriteria.delivery +
      scores.reliability * cfp.evaluationCriteria.reliability
    );
    
    const feedback: string[] = [];
    
    if (scores.price < 0.5) feedback.push('Price is above budget expectations');
    if (scores.quality < 0.6) feedback.push('Quality guarantee is below requirements');
    if (scores.delivery < 0.7) feedback.push('Delivery time is concerning');
    if (scores.reliability < 0.8) feedback.push('Agent reliability needs improvement');
    
    return {
      bidId: proposal.bidId,
      scores,
      weightedScore,
      ranking: 0, // Will be set during ranking
      feedback,
      recommended: weightedScore >= 0.7
    };
  }

  /**
   * Award contract to winning proposal
   */
  private async awardContract(
    sessionId: string,
    winnerAgentId: string,
    winningProposal: Proposal
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    console.log(chalk.green(`🏆 Awarding contract to agent ${winnerAgentId} for session: ${sessionId}`));
    
    const contractAward: ContractAward = {
      contractId: uuidv4(),
      winningBid: winningProposal,
      agreedTerms: {
        ...winningProposal.terms,
        sessionId,
        awardedAt: new Date()
      },
      deliverables: [`Capability execution: ${session.requirement.capabilityId}`],
      penalties: {
        lateDelivery: winningProposal.price * 0.1,
        qualityBreach: winningProposal.price * 0.2,
        cancellation: winningProposal.price * 0.05
      }
    };
    
    // Update session
    session.status = 'completed';
    session.endTime = new Date();
    session.finalContract = contractAward;
    
    // Update current round
    const currentRound = session.rounds[session.rounds.length - 1];
    currentRound.winner = winnerAgentId;
    currentRound.award = contractAward;
    
    // Send award message to winner
    const awardMessage: CNPMessage = {
      id: uuidv4(),
      type: 'accept-proposal',
      sender: session.managerId,
      recipient: winnerAgentId,
      taskId: sessionId,
      timestamp: new Date(),
      data: contractAward
    };
    
    this.recordMessage(sessionId, awardMessage);
    
    // Send rejection messages to other participants
    for (const [agentId, proposal] of currentRound.proposals) {
      if (agentId !== winnerAgentId) {
        const rejectionMessage: CNPMessage = {
          id: uuidv4(),
          type: 'reject-proposal',
          sender: session.managerId,
          recipient: agentId,
          taskId: sessionId,
          timestamp: new Date(),
          data: {
            reason: 'Another proposal was selected',
            feedback: currentRound.evaluations.get(agentId)?.feedback || []
          }
        };
        
        this.recordMessage(sessionId, rejectionMessage);
        currentRound.rejections.set(agentId, 'Contract awarded to another agent');
      }
    }
    
    // Calculate final metrics
    this.calculateSessionMetrics(session);
    
    this.emit('contractAwarded', { sessionId, winnerAgentId, contractAward });
  }

  /**
   * Handle negotiation when no proposals are received
   */
  private async handleNoProposals(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    if (session.rounds.length < this.maxRounds) {
      // Try another round with relaxed constraints
      console.log(chalk.yellow(`🔄 Retrying negotiation with relaxed constraints for session: ${sessionId}`));
      
      const currentRound = session.rounds[session.rounds.length - 1];
      const relaxedCfp: CallForProposals = {
        ...currentRound.cfp,
        budget: currentRound.cfp.budget ? currentRound.cfp.budget * 1.2 : undefined,
        deadline: new Date(currentRound.cfp.deadline.getTime() + 24 * 60 * 60 * 1000),
        proposalDeadline: new Date(Date.now() + this.defaultTimeout)
      };
      
      await this.startNegotiationRound(sessionId, relaxedCfp);
    } else {
      await this.handleNegotiationFailure(sessionId, 'No proposals received after multiple rounds');
    }
  }

  /**
   * Start next negotiation round with feedback
   */
  private async startNextRound(
    sessionId: string,
    evaluations: ProposalEvaluation[]
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    console.log(chalk.blue(`🔄 Starting next round of negotiation for session: ${sessionId}`));
    
    const currentRound = session.rounds[session.rounds.length - 1];
    
    // Create feedback for next round
    const feedback = evaluations.map(eval => ({
      agentId: Array.from(currentRound.proposals.entries())
        .find(([_, proposal]) => proposal.bidId === eval.bidId)?.[0],
      feedback: eval.feedback,
      score: eval.weightedScore
    })).filter(f => f.agentId);
    
    // Adjust CFP based on feedback
    const adjustedCfp: CallForProposals = {
      ...currentRound.cfp,
      proposalDeadline: new Date(Date.now() + this.defaultTimeout),
      // Add feedback to help agents improve their bids
      constraints: {
        ...currentRound.cfp.constraints,
        previousRoundFeedback: feedback
      }
    };
    
    await this.startNegotiationRound(sessionId, adjustedCfp);
  }

  /**
   * Handle negotiation failure
   */
  private async handleNegotiationFailure(
    sessionId: string,
    reason: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    console.log(chalk.red(`❌ Negotiation failed for session ${sessionId}: ${reason}`));
    
    session.status = 'failed';
    session.endTime = new Date();
    
    this.calculateSessionMetrics(session);
    
    // Send cancellation messages to participants
    for (const agentId of session.participants) {
      const cancelMessage: CNPMessage = {
        id: uuidv4(),
        type: 'cancel',
        sender: session.managerId,
        recipient: agentId,
        taskId: sessionId,
        timestamp: new Date(),
        data: { reason }
      };
      
      this.recordMessage(sessionId, cancelMessage);
    }
    
    this.emit('negotiationFailed', { sessionId, reason, session });
  }

  /**
   * Calculate session metrics
   */
  private calculateSessionMetrics(session: NegotiationSession): void {
    const totalDuration = session.endTime 
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();
    
    const responseTimeSum = session.rounds.reduce((sum, round) => {
      return sum + Array.from(round.proposals.values()).reduce((roundSum, proposal) => {
        // Simulate response time calculation
        return roundSum + Math.random() * 5000 + 1000;
      }, 0);
    }, 0);
    
    session.metrics.averageResponseTime = session.metrics.totalProposals > 0 
      ? responseTimeSum / session.metrics.totalProposals 
      : 0;
    
    // Calculate participation rate (simplified)
    const potentialParticipants = 10; // Assume 10 potential agents
    session.metrics.participationRate = session.participants.size / potentialParticipants;
    
    // Calculate negotiation efficiency
    const successful = session.status === 'completed' ? 1 : 0;
    const roundEfficiency = 1 / session.rounds.length; // Fewer rounds = more efficient
    session.metrics.negotiationEfficiency = successful * roundEfficiency;
  }

  // Scoring helper methods
  private evaluatePriceScore(price: number, budget?: number): number {
    if (!budget) return 0.5;
    if (price <= budget * 0.8) return 1.0;
    if (price <= budget) return 0.8;
    if (price <= budget * 1.2) return 0.4;
    return 0.1;
  }

  private evaluateQualityScore(qualityGuarantee: number): number {
    return Math.min(1, qualityGuarantee);
  }

  private evaluateDeliveryScore(estimatedCompletion: Date, deadline: Date): number {
    const timeToDeadline = deadline.getTime() - Date.now();
    const timeToCompletion = estimatedCompletion.getTime() - Date.now();
    
    if (timeToCompletion <= timeToDeadline * 0.5) return 1.0;
    if (timeToCompletion <= timeToDeadline * 0.8) return 0.8;
    if (timeToCompletion <= timeToDeadline) return 0.6;
    return 0.2;
  }

  private evaluateReliabilityScore(reliabilityScore: number, experience: any): number {
    const baseScore = Math.min(1, reliabilityScore);
    const experienceBonus = Math.min(0.2, experience.successRate * 0.1);
    return Math.min(1, baseScore + experienceBonus);
  }

  /**
   * Record message in history
   */
  private recordMessage(sessionId: string, message: CNPMessage): void {
    const history = this.messageHistory.get(sessionId) || [];
    history.push(message);
    this.messageHistory.set(sessionId, history);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('error', (error) => {
      console.error(chalk.red('❌ CNP Protocol error:'), error);
    });
  }

  /**
   * Get negotiation session
   */
  public getSession(sessionId: string): NegotiationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get message history for session
   */
  public getMessageHistory(sessionId: string): CNPMessage[] {
    return this.messageHistory.get(sessionId) || [];
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): NegotiationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Cancel negotiation session
   */
  public async cancelNegotiation(sessionId: string, reason: string): Promise<void> {
    await this.handleNegotiationFailure(sessionId, reason);
  }

  /**
   * Update agent capabilities for better proposal matching
   */
  public updateAgentCapabilities(agentId: string, capabilities: AgentCapability[]): void {
    this.agentCapabilities.set(agentId, capabilities);
  }

  /**
   * Update agent performance data
   */
  public updateAgentPerformance(agentId: string, performance: any): void {
    this.agentPerformance.set(agentId, performance);
  }
}

export default ContractNetProtocol;