/**
 * Email Verification Manager
 * 
 * Use context7: IMAP-based email monitoring and verification
 * Following All-Purpose Pattern: Configurable for ANY email provider
 */

import { ImapFlow } from 'imapflow';
import { v4 as uuidv4 } from 'uuid';
import { EmailConfig, EmailVerification } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class EmailVerificationManager {
  private config: EmailConfig;
  private imapClient?: ImapFlow;
  private isConnected = false;
  private verifications: Map<string, EmailVerification> = new Map();
  private pollingInterval?: NodeJS.Timeout;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Start the email verification manager
   */
  async start(): Promise<void> {
    try {
      // Initialize IMAP connection
      this.imapClient = new ImapFlow({
        host: this.config.imapConfig.host,
        port: this.config.imapConfig.port,
        secure: this.config.imapConfig.secure,
        auth: {
          user: this.config.imapConfig.username,
          pass: this.config.imapConfig.password
        }
      });

      // Connect to IMAP server
      await this.imapClient.connect();
      this.isConnected = true;

      // Start polling for new emails
      this.startPolling();

      logger.info('📧 Email Verification Manager started', {
        host: this.config.imapConfig.host,
        checkInterval: this.config.checkInterval
      });

    } catch (error) {
      logger.error('❌ Failed to start Email Verification Manager', { error });
      throw error;
    }
  }

  /**
   * Stop the email verification manager
   */
  async stop(): Promise<void> {
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = undefined;
      }

      if (this.imapClient && this.isConnected) {
        await this.imapClient.logout();
        this.isConnected = false;
      }

      logger.info('📧 Email Verification Manager stopped');

    } catch (error) {
      logger.error('❌ Failed to stop Email Verification Manager', { error });
    }
  }

  /**
   * Start verification for a service
   */
  async startVerification(serviceId: string, email: string): Promise<EmailVerification> {
    const verification: EmailVerification = {
      id: uuidv4(),
      serviceId,
      email,
      status: 'pending',
      attemptCount: 0,
      firstAttempt: new Date(),
      expiresAt: new Date(Date.now() + this.config.verificationTimeout * 60 * 1000)
    };

    this.verifications.set(verification.id, verification);

    logger.info('🔍 Started email verification', {
      verificationId: verification.id,
      serviceId,
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2') // Mask email for privacy
    });

    return verification;
  }

  /**
   * Wait for verification completion
   */
  async waitForVerification(
    verificationId: string, 
    timeoutMs: number
  ): Promise<{ success: boolean; verificationUrl?: string; error?: string }> {
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      return { success: false, error: 'Verification not found' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Verification timeout' });
      }, timeoutMs);

      const checkInterval = setInterval(() => {
        const currentVerification = this.verifications.get(verificationId);
        
        if (!currentVerification) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve({ success: false, error: 'Verification was removed' });
          return;
        }

        if (currentVerification.status === 'verified') {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve({ 
            success: true, 
            verificationUrl: currentVerification.verificationUrl 
          });
        } else if (currentVerification.status === 'failed') {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve({ success: false, error: 'Verification failed' });
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Start polling for new emails
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForVerificationEmails();
      } catch (error) {
        logger.error('Error during email polling', { error });
      }
    }, this.config.checkInterval * 1000);
  }

  /**
   * Check for verification emails
   */
  private async checkForVerificationEmails(): Promise<void> {
    if (!this.imapClient || !this.isConnected) {
      return;
    }

    try {
      // Select inbox
      await this.imapClient.mailboxOpen('INBOX');

      // Get pending verifications
      const pendingVerifications = Array.from(this.verifications.values())
        .filter(v => v.status === 'pending' && v.expiresAt > new Date());

      if (pendingVerifications.length === 0) {
        return;
      }

      // Search for new emails in the last 10 minutes
      const since = new Date(Date.now() - 10 * 60 * 1000);
      const searchResult = await this.imapClient.search({
        since,
        unseen: true
      });

      if (searchResult.length === 0) {
        return;
      }

      // Fetch email headers and content
      for await (const message of this.imapClient.fetch(searchResult, {
        envelope: true,
        bodyStructure: true,
        source: true
      })) {
        await this.processVerificationEmail(message, pendingVerifications);
      }

    } catch (error) {
      logger.error('Error checking for verification emails', { error });
    }
  }

  /**
   * Process a potential verification email
   */
  private async processVerificationEmail(message: any, pendingVerifications: EmailVerification[]): Promise<void> {
    try {
      const envelope = message.envelope;
      const source = message.source.toString();

      // Extract email content
      const subject = envelope.subject || '';
      const from = envelope.from?.[0]?.address || '';
      const to = envelope.to?.[0]?.address || '';

      // Check if this email matches any pending verification
      for (const verification of pendingVerifications) {
        if (this.isVerificationEmail(subject, from, source, verification)) {
          // Extract verification URL or code
          const verificationData = this.extractVerificationData(source);
          
          if (verificationData.url || verificationData.code) {
            verification.status = 'verified';
            verification.verificationUrl = verificationData.url;
            verification.verificationCode = verificationData.code;
            verification.verifiedAt = new Date();
            verification.emailSubject = subject;
            verification.emailSender = from;

            logger.info('✅ Email verification found', {
              verificationId: verification.id,
              serviceId: verification.serviceId,
              subject: subject.substring(0, 50) + '...'
            });

            // Mark email as read
            await this.imapClient?.messageUpdate(message.seq, { flags: ['\\Seen'] });
          }
        }
      }

    } catch (error) {
      logger.error('Error processing verification email', { error });
    }
  }

  /**
   * Check if email is a verification email for the given verification
   */
  private isVerificationEmail(subject: string, from: string, content: string, verification: EmailVerification): boolean {
    const verificationKeywords = [
      'verify', 'verification', 'confirm', 'activation', 'activate',
      'welcome', 'getting started', 'complete your', 'finish setup'
    ];

    const serviceKeywords = this.getServiceKeywords(verification.serviceId);

    // Check subject for verification keywords
    const hasVerificationKeyword = verificationKeywords.some(keyword => 
      subject.toLowerCase().includes(keyword)
    );

    // Check if from domain matches service
    const hasServiceKeyword = serviceKeywords.some(keyword => 
      from.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)
    );

    return hasVerificationKeyword && hasServiceKeyword;
  }

  /**
   * Get service-specific keywords for email matching
   */
  private getServiceKeywords(serviceId: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'google-cloud': ['google', 'gmail', 'gcp', 'cloud.google'],
      'github': ['github', 'noreply@github'],
      'anthropic': ['anthropic', 'claude'],
      'openai': ['openai', 'chatgpt'],
      'upstash': ['upstash'],
      'vercel': ['vercel'],
      'aws': ['amazon', 'aws', 'amazonaws'],
      'azure': ['microsoft', 'azure', 'outlook']
    };

    return keywordMap[serviceId] || [serviceId];
  }

  /**
   * Extract verification URL or code from email content
   */
  private extractVerificationData(content: string): { url?: string; code?: string } {
    // URL patterns
    const urlPatterns = [
      /https?:\/\/[^\s<>"']+(?:verify|confirm|activate)[^\s<>"']*/gi,
      /https?:\/\/[^\s<>"']+(?:token|code)=[^\s<>"']*/gi,
      /https?:\/\/[^\s<>"']+\/verify\/[^\s<>"']*/gi
    ];

    // Code patterns (6-8 digit codes)
    const codePatterns = [
      /(?:verification|confirm|activation)\s*code[:\s]*([A-Z0-9]{6,8})/gi,
      /your\s+code[:\s]*([A-Z0-9]{6,8})/gi,
      /code[:\s]*([A-Z0-9]{6,8})/gi
    ];

    // Extract URLs
    for (const pattern of urlPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        return { url: matches[0] };
      }
    }

    // Extract codes
    for (const pattern of codePatterns) {
      const match = pattern.exec(content);
      if (match && match[1]) {
        return { code: match[1] };
      }
    }

    return {};
  }

  /**
   * Get verification status
   */
  getVerificationStatus(verificationId: string): EmailVerification | undefined {
    return this.verifications.get(verificationId);
  }

  /**
   * Clean up expired verifications
   */
  cleanupExpiredVerifications(): void {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, verification] of this.verifications) {
      if (verification.expiresAt < now) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.verifications.delete(id);
    }

    if (expiredIds.length > 0) {
      logger.info(`🧹 Cleaned up ${expiredIds.length} expired email verifications`);
    }
  }

  /**
   * Get manager status
   */
  getStatus(): {
    connected: boolean;
    activeVerifications: number;
    totalVerifications: number;
  } {
    return {
      connected: this.isConnected,
      activeVerifications: Array.from(this.verifications.values())
        .filter(v => v.status === 'pending').length,
      totalVerifications: this.verifications.size
    };
  }
}