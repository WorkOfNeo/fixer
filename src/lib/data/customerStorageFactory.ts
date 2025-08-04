/**
 * Factory for determining storage configuration
 * Simplified to avoid client/server build issues
 */
export class CustomerStorageFactory {
  /**
   * Get the current storage type
   */
  static getStorageType(): 'json' | 'supabase' {
    const storageType = process.env.CUSTOMER_STORAGE_TYPE || 'json'
    return storageType.toLowerCase() === 'supabase' ? 'supabase' : 'json'
  }

  /**
   * Check if Supabase is properly configured
   */
  static isSupabaseConfigured(): boolean {
    return !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }

  /**
   * Validate storage configuration
   */
  static validateConfiguration(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    const storageType = this.getStorageType()

    // Check basic requirements
    if (!process.env.SPY_USER || !process.env.SPY_PASS) {
      errors.push('SPY system credentials (SPY_USER, SPY_PASS) are required')
    }

    if (!process.env.OPENAI_API_KEY) {
      errors.push('OpenAI API key (OPENAI_API_KEY) is required')
    }

    // Check storage-specific requirements
    if (storageType === 'supabase') {
      if (!this.isSupabaseConfigured()) {
        errors.push('Supabase configuration (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) is required for Supabase storage')
      }
    } else {
      if (this.isSupabaseConfigured()) {
        warnings.push('Supabase is configured but JSON storage is selected. Set CUSTOMER_STORAGE_TYPE=supabase to use Supabase.')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get configuration summary for debugging
   */
  static getConfigSummary(): {
    storageType: 'json' | 'supabase'
    supabaseConfigured: boolean
    dataDir?: string
    isValid: boolean
    issues: string[]
  } {
    const validation = this.validateConfiguration()
    const storageType = this.getStorageType()

    return {
      storageType,
      supabaseConfigured: this.isSupabaseConfigured(),
      dataDir: storageType === 'json' ? (process.env.CUSTOMER_DATA_DIR || 'data') : undefined,
      isValid: validation.isValid,
      issues: [...validation.errors, ...validation.warnings]
    }
  }
} 