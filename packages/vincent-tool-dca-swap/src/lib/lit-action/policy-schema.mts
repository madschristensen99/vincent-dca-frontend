import { z } from 'zod';

// Define the schema for the Lit Action parameters
export const litActionParamsSchema = z.object({
  // Private key for the wallet (required)
  privateKey: z.string()
    .min(1, "Private key is required")
    .startsWith("0x", "Private key must start with 0x"),
  
  // RPC URL for the blockchain network (required)
  rpcUrl: z.string()
    .url("RPC URL must be a valid URL")
    .startsWith("https://", "RPC URL must use HTTPS"),
  
  // Chain ID (required)
  chainId: z.string()
    .min(1, "Chain ID is required")
    .refine(value => !isNaN(parseInt(value)), "Chain ID must be a number"),
  
  // Input token address or 'eth' for ETH (required)
  tokenIn: z.string()
    .min(1, "Input token is required")
    .refine(
      value => value.toLowerCase() === 'eth' || value.startsWith('0x'),
      "Token address must be 'eth' or start with 0x"
    ),
  
  // Output token address (required)
  tokenOut: z.string()
    .min(1, "Output token is required")
    .refine(
      value => value.toLowerCase() === 'eth' || value.startsWith('0x'),
      "Token address must be 'eth' or start with 0x"
    ),
  
  // Amount of input token to swap (required)
  amountIn: z.string()
    .min(1, "Input amount is required")
    .refine(
      value => !isNaN(parseFloat(value)) && parseFloat(value) > 0,
      "Input amount must be a positive number"
    ),
  
  // Spending limit contract address (optional)
  spendingLimitContractAddress: z.string()
    .startsWith('0x', "Contract address must start with 0x")
    .length(42, "Contract address must be 42 characters long")
    .optional(),
  
  // Allowed tokens list (optional)
  allowedTokens: z.array(z.string())
    .optional()
});

// Function to validate the parameters
export function validateLitActionParams(params: any) {
  try {
    const result = litActionParamsSchema.safeParse(params);
    if (!result.success) {
      // Format the validation errors
      const formattedErrors = result.error.format();
      return {
        valid: false,
        errors: formattedErrors
      };
    }
    return {
      valid: true,
      data: result.data
    };
  } catch (error) {
    return {
      valid: false,
      errors: error
    };
  }
}

// Export the schema for use in other files
export default litActionParamsSchema;
