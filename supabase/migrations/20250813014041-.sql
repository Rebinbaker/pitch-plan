-- Fix security issues identified by the linter

-- 1. Fix OTP expiry settings - reduce from default to recommended threshold
UPDATE auth.config 
SET 
  otp_expiry = 300  -- 5 minutes instead of default longer expiry
WHERE TRUE;

-- 2. Enable leaked password protection
UPDATE auth.config 
SET 
  password_min_length = 8,
  password_require_uppercase = true,
  password_require_lowercase = true,
  password_require_numbers = true,
  password_require_symbols = true,
  password_leaked_password_check = true  -- Enable leaked password protection
WHERE TRUE;

-- 3. Add additional security configurations
UPDATE auth.config 
SET 
  max_password_length = 128,
  rate_limit_email_sent = 3,  -- Limit email sending to 3 per minute
  rate_limit_sms_sent = 3,    -- Limit SMS sending to 3 per minute
  rate_limit_verify = 5       -- Limit verification attempts to 5 per minute
WHERE TRUE;