@coordination
Feature: UEP Agent Coordination Patterns
  As a UEP system
  I want to validate multi-agent coordination patterns
  So that I can ensure reliable agent collaboration and workflow execution

  Background:
    Given the UEP system is initialized
    And coordination logging is enabled

  @scatter-gather @basic
  Scenario: Scatter-Gather Coordination Pattern
    Given I have 1 agents of type "ORCHESTRATOR"
    And I have 5 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "SCATTER_GATHER"
    And all agents are in "ACTIVE" state
    When I initiate a scatter-gather coordination
    Then all agents should receive the coordination request
    And I should receive responses from all participating agents
    And coordination should complete within 10 seconds
    And the coordination metrics should show success rate above 0.95

  @pipeline @basic
  Scenario: Pipeline Workflow Coordination
    Given I have 1 agents of type "ORCHESTRATOR"
    And I have 4 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "PIPELINE"
    And all agents are in "ACTIVE" state
    When I execute a pipeline workflow with 4 stages
    Then the pipeline should process data through all stages
    And coordination should complete within 15 seconds
    And the coordination metrics should show success rate above 0.90

  @broadcast @basic
  Scenario: Broadcast Communication Pattern
    Given I have 1 agents of type "META_AGENT"
    And I have 8 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "BROADCAST"
    And all agents are in "ACTIVE" state
    When I broadcast a message to all agents
    Then all agents should receive the broadcast message
    And coordination should complete within 5 seconds

  @request-reply @basic
  Scenario: Request-Reply Coordination Pattern
    Given I have 2 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "REQUEST_REPLY"
    And all agents are in "ACTIVE" state
    When agent "domain_agent_1" sends a request to agent "domain_agent_2"
    Then the request should receive a valid response
    And coordination should complete within 3 seconds

  @failure-handling @advanced
  Scenario: Coordination with Agent Failure
    Given I have 1 agents of type "ORCHESTRATOR"
    And I have 3 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "SCATTER_GATHER"
    And all agents are in "ACTIVE" state
    When I initiate a scatter-gather coordination
    And agent "domain_agent_2" fails during coordination
    Then error handling should be triggered
    And compensation flows should be executed
    And coordination should complete within 20 seconds

  @synchronization @advanced
  Scenario: Agent Synchronization Barriers
    Given I have 6 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "CHOREOGRAPHY"
    And all agents are in "ACTIVE" state
    When agents reach synchronization barrier "barrier_1"
    Then all agents should wait for synchronization
    And agents should be released simultaneously
    And coordination should complete within 8 seconds

  @timeout-handling @advanced
  Scenario: Coordination Timeout Handling
    Given I have 1 agents of type "ORCHESTRATOR"
    And I have 3 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "SCATTER_GATHER"
    And coordination timeout is set to 2 seconds
    When I initiate a scatter-gather coordination
    And agent "domain_agent_3" becomes unresponsive
    Then coordination timeout should be triggered
    And partial results should be collected
    And timeout error should be recorded

  @performance @load
  Scenario: High-Load Coordination Performance
    Given I have 1 agents of type "ORCHESTRATOR"
    And I have 50 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "SCATTER_GATHER"
    And all agents are in "ACTIVE" state
    When I initiate a scatter-gather coordination
    Then all agents should receive the coordination request
    And I should receive responses from all participating agents
    And coordination should complete within 30 seconds
    And average response time should be less than 100 milliseconds

  @nested-coordination @advanced
  Scenario: Nested Coordination Patterns
    Given I have 1 agents of type "ORCHESTRATOR"
    And I have 2 agents of type "META_AGENT"
    And I have 6 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "ORCHESTRATION"
    When orchestrator initiates nested scatter-gather patterns
    And each meta-agent coordinates with 3 domain agents
    Then nested coordination should complete successfully
    And all coordination levels should maintain consistency
    And coordination should complete within 25 seconds

  @compensation @advanced
  Scenario: Saga Pattern Compensation Flow
    Given I have 1 agents of type "ORCHESTRATOR"
    And I have 4 agents of type "DOMAIN_AGENT"
    And the coordination pattern is "PIPELINE"
    And compensation flows are enabled
    When I execute a pipeline workflow with 4 stages
    And stage 3 fails with recoverable error
    Then compensation should be triggered for completed stages
    And stages 1 and 2 should be rolled back
    And workflow should be marked as compensated
    And coordination should complete within 15 seconds