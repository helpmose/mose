/**
 * Error handling utilities for MOSÉ platform
 * Maps technical errors to user-friendly messages with actionable next steps
 */

export interface UserError {
  message: string;
  action: 'retry' | 'login' | 'contact_support' | 'different_email';
  redirectTo?: string;
  technical?: string; // For logging purposes only
}

export interface RegistrationResult {
  success: boolean;
  user?: any;
  profile?: any;
  error?: UserError;
  nextStep?: 'login' | 'complete_profile' | 'verify_email';
}

export class ErrorHandler {
  /**
   * Map Appwrite errors to user-friendly messages
   */
  static mapAppwriteError(error: any): UserError {
    const message = error.message || error.toString();
    const code = error.code;
    const type = error.type;

    // Account creation errors
    if (type === 'user_already_exists' || message.includes('already exists')) {
      return {
        message: 'An account with this email already exists. Please sign in instead.',
        action: 'login',
        redirectTo: '/login',
        technical: `Appwrite error: ${message}`
      };
    }

    // Authentication errors
    if (code === 401 || type === 'user_unauthorized') {
      return {
        message: 'Account created successfully! Please sign in to complete your setup.',
        action: 'login',
        redirectTo: '/login',
        technical: `Appwrite error: ${message}`
      };
    }

    // Invalid email format
    if (type === 'user_invalid_format' || message.includes('email')) {
      return {
        message: 'Please enter a valid email address.',
        action: 'retry',
        technical: `Appwrite error: ${message}`
      };
    }

    // Password validation errors
    if (message.includes('password') && (message.includes('short') || message.includes('length'))) {
      return {
        message: 'Password must be at least 8 characters long.',
        action: 'retry',
        technical: `Appwrite error: ${message}`
      };
    }

    // Network/connection errors
    if (message.includes('network') || message.includes('fetch') || code === 0) {
      return {
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        action: 'retry',
        technical: `Network error: ${message}`
      };
    }

    // Rate limiting
    if (code === 429 || message.includes('rate limit')) {
      return {
        message: 'Too many requests. Please wait a moment and try again.',
        action: 'retry',
        technical: `Rate limit error: ${message}`
      };
    }

    // Server errors
    if (code >= 500) {
      return {
        message: 'Our servers are experiencing issues. Please try again in a few minutes.',
        action: 'contact_support',
        technical: `Server error: ${message}`
      };
    }

    // Generic errors
    return {
      message: 'Registration failed. Please try again or contact support if the problem persists.',
      action: 'retry',
      technical: `Unknown error: ${message}`
    };
  }

  /**
   * Handle registration errors specifically
   */
  static handleRegistrationError(error: any, step: 'account_creation' | 'session_creation' | 'profile_creation'): UserError {
    const baseError = this.mapAppwriteError(error);

    switch (step) {
      case 'account_creation':
        return baseError; // Use the mapped error as-is

      case 'session_creation':
        return {
          message: 'Account created successfully! Please sign in to continue.',
          action: 'login',
          redirectTo: '/login',
          technical: `Session creation failed: ${error.message}`
        };

      case 'profile_creation':
        return {
          message: 'Account created successfully! Please sign in to complete your setup.',
          action: 'login', 
          redirectTo: '/login',
          technical: `Profile creation failed: ${error.message}`
        };

      default:
        return baseError;
    }
  }

  /**
   * Log errors for debugging while protecting user privacy
   */
  static logError(error: UserError, context: string) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 ${context}:`, {
        userMessage: error.message,
        action: error.action,
        technical: error.technical,
        redirectTo: error.redirectTo
      });
    }
  }

  /**
   * Check if an error indicates an account already exists
   */
  static isAccountExistsError(error: any): boolean {
    const message = error.message || error.toString();
    const type = error.type;
    return type === 'user_already_exists' || message.includes('already exists');
  }

  /**
   * Check if an error indicates authentication issues
   */
  static isAuthError(error: any): boolean {
    return error.code === 401 || error.type === 'user_unauthorized';
  }

  /**
   * Create success response for registration
   */
  static createSuccessResult(user: any, profile?: any): RegistrationResult {
    return {
      success: true,
      user,
      profile,
      nextStep: profile ? undefined : 'complete_profile'
    };
  }

  /**
   * Create error response for registration
   */
  static createErrorResult(error: any, step: 'account_creation' | 'session_creation' | 'profile_creation' = 'account_creation'): RegistrationResult {
    const userError = this.handleRegistrationError(error, step);
    this.logError(userError, `Registration failed at ${step}`);
    
    return {
      success: false,
      error: userError
    };
  }
}