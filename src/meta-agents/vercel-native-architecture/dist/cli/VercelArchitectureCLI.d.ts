/**
 * Vercel Architecture CLI - Command-line interface for Vercel-Native Architecture Agent
 *
 * Provides unlimited CLI capabilities with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on CLI complexity
 */
export declare class VercelArchitectureCLI {
    private program;
    private agent;
    constructor();
    private setupCommands;
    run(args: string[]): Promise<void>;
    private initializeAgent;
    private handleBuildCommand;
    private handleDeployCommand;
    private handleOptimizeCommand;
    private handleMonitorCommand;
    private handleInitCommand;
    private handleStatusCommand;
    private handleCoordinateCommand;
    private promptForBuildOptions;
    private promptForRequiredOptions;
    private promptForInitOptions;
    private loadDeploymentInfo;
}
export declare function runCLI(args: string[]): Promise<void>;
export default VercelArchitectureCLI;
//# sourceMappingURL=VercelArchitectureCLI.d.ts.map