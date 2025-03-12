import { dexService } from './dexService';
import type { TokenPurchaseOptions } from './dexService';

// Interface for DCA schedule
export interface DCASchedule {
  _id: string;
  walletAddress: string;
  tokenAddress: string;
  amount: string;
  frequency: string; // 'daily', 'weekly', 'monthly'
  active: boolean;
  lastExecuted?: Date;
}

// Interface for DCA execution result
export interface DCAExecutionResult {
  scheduleId: string;
  success: boolean;
  transactionHash?: string;
  error?: string;
  executedAt: Date;
}

/**
 * Service for executing DCA schedules
 */
export class DCAService {
  private backendUrl: string;
  private dexRouterAddress: string;
  
  constructor(
    backendUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    dexRouterAddress: string = '0x4200000000000000000000000000000000000006' // Default to Base Mainnet WETH
  ) {
    this.backendUrl = backendUrl;
    this.dexRouterAddress = dexRouterAddress;
  }
  
  /**
   * Execute a DCA schedule
   * @param schedule DCA schedule to execute
   * @param privateKey Private key for the wallet (in production, this would come from PKP)
   * @returns DCA execution result
   */
  async executeDCASchedule(
    schedule: DCASchedule, 
    privateKey: string
  ): Promise<DCAExecutionResult> {
    try {
      // Prepare purchase options
      const purchaseOptions: TokenPurchaseOptions = {
        walletAddress: schedule.walletAddress,
        privateKey: privateKey,
        amount: schedule.amount,
        tokenAddress: schedule.tokenAddress,
        dexRouterAddress: this.dexRouterAddress,
        slippageTolerance: 0.5, // Default 0.5% slippage
        deadline: 300 // 5 minutes
      };
      
      // Execute purchase
      const txHash = await dexService.purchaseTokensWithETH(purchaseOptions);
      
      // Update schedule's lastExecuted timestamp
      await this.updateScheduleLastExecuted(schedule._id);
      
      return {
        scheduleId: schedule._id,
        success: true,
        transactionHash: txHash,
        executedAt: new Date()
      };
    } catch (error) {
      console.error(`Error executing DCA schedule ${schedule._id}:`, error);
      
      return {
        scheduleId: schedule._id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: new Date()
      };
    }
  }
  
  /**
   * Execute all active DCA schedules for a wallet
   * @param walletAddress Wallet address
   * @param privateKey Private key for the wallet (in production, this would come from PKP)
   * @returns Array of DCA execution results
   */
  async executeAllActiveSchedules(
    walletAddress: string, 
    privateKey: string
  ): Promise<DCAExecutionResult[]> {
    try {
      // Get all active schedules for the wallet
      const schedules = await this.getActiveSchedules(walletAddress);
      
      // Filter schedules that are due for execution
      const dueSchedules = schedules.filter(schedule => this.isScheduleDue(schedule));
      
      if (dueSchedules.length === 0) {
        console.log(`No DCA schedules due for execution for wallet ${walletAddress}`);
        return [];
      }
      
      // Execute each due schedule
      const executionPromises = dueSchedules.map(schedule => 
        this.executeDCASchedule(schedule, privateKey)
      );
      
      return await Promise.all(executionPromises);
    } catch (error) {
      console.error(`Error executing DCA schedules for wallet ${walletAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if a schedule is due for execution
   * @param schedule DCA schedule
   * @returns True if the schedule is due for execution
   */
  private isScheduleDue(schedule: DCASchedule): boolean {
    if (!schedule.active) {
      return false;
    }
    
    const now = new Date();
    const lastExecuted = schedule.lastExecuted ? new Date(schedule.lastExecuted) : null;
    
    if (!lastExecuted) {
      return true; // Never executed before
    }
    
    const diffInDays = (now.getTime() - lastExecuted.getTime()) / (1000 * 60 * 60 * 24);
    
    switch (schedule.frequency) {
      case 'daily':
        return diffInDays >= 1;
      case 'weekly':
        return diffInDays >= 7;
      case 'monthly':
        return diffInDays >= 30;
      default:
        return false;
    }
  }
  
  /**
   * Get all active DCA schedules for a wallet
   * @param walletAddress Wallet address
   * @returns Array of active DCA schedules
   */
  async getActiveSchedules(walletAddress: string): Promise<DCASchedule[]> {
    try {
      // Get JWT token for authentication
      const token = await this.getToken(walletAddress);
      
      const response = await fetch(`${this.backendUrl}/api/schedules?walletAddress=${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get schedules: ${response.statusText}`);
      }
      
      const schedules = await response.json();
      return schedules.filter((schedule: DCASchedule) => schedule.active);
    } catch (error) {
      console.error(`Error getting active schedules for wallet ${walletAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a schedule's lastExecuted timestamp
   * @param scheduleId Schedule ID
   * @returns Updated schedule
   */
  private async updateScheduleLastExecuted(scheduleId: string): Promise<DCASchedule> {
    try {
      // For now, we'll use a mock token - in production this would be a real JWT
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3YWxsZXRBZGRyZXNzIjoiMHhENDM4M2MxNTE1OEIxMWE0RmE1MUY0ODlBQkNCM0Q0RTQzNTExYjBhIiwicm9sZUlkIjoiYTViODM0NjctNGFjOS00OWI2LWI0NWMtMjg1NTJmNTFiMDI2IiwiaWF0IjoxNzExMTM0NDY1LCJleHAiOjE3MTExMzgwNjV9.placeholder_signature";
      
      const response = await fetch(`${this.backendUrl}/api/schedules/${scheduleId}/execute`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lastExecuted: new Date().toISOString() })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update schedule: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error updating schedule ${scheduleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get JWT token for authentication
   * @param walletAddress Wallet address
   * @returns JWT token
   */
  private async getToken(walletAddress: string): Promise<string> {
    // For now, return a mock token
    // In production, this would generate a real JWT using the Vincent SDK
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3YWxsZXRBZGRyZXNzIjoiMHhENDM4M2MxNTE1OEIxMWE0RmE1MUY0ODlBQkNCM0Q0RTQzNTExYjBhIiwicm9sZUlkIjoiYTViODM0NjctNGFjOS00OWI2LWI0NWMtMjg1NTJmNTFiMDI2IiwiaWF0IjoxNzExMTM0NDY1LCJleHAiOjE3MTExMzgwNjV9.placeholder_signature";
  }
}

// Export singleton instance
export const dcaService = new DCAService();
