// Registration form validation utilities

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
  warnings: { [key: string]: string };
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

// Disposable email domains list
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'temp-mail.org', 'throwaway.email', 'getnada.com',
  'maildrop.cc', 'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'tempail.com', 'tempr.email',
  'fakeinbox.com', 'mohmal.com', 'mailcatch.com', 'emailondeck.com'
];

// Common postal code patterns by country
const POSTAL_CODE_PATTERNS: { [key: string]: RegExp } = {
  'India': /^[1-9][0-9]{5}$/,
  'United States of America': /^\d{5}(-\d{4})?$/,
  'United Kingdom': /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-Z]{2}$/i,
  'Canada': /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
  'Australia': /^\d{4}$/,
  'Germany': /^\d{5}$/,
  'France': /^\d{5}$/,
  'Japan': /^\d{3}-\d{4}$/,
  'Singapore': /^\d{6}$/,
  'Brazil': /^\d{5}-?\d{3}$/,
  'Netherlands': /^\d{4}\s?[A-Z]{2}$/i,
  'Spain': /^\d{5}$/,
  'Italy': /^\d{5}$/,
  'China': /^\d{6}$/,
  'South Africa': /^\d{4}$/,
  'Mexico': /^\d{5}$/,
  'South Korea': /^\d{5}$/,
  'Sweden': /^\d{3}\s?\d{2}$/,
  'Norway': /^\d{4}$/,
  'Denmark': /^\d{4}$/,
  'Finland': /^\d{5}$/,
  'New Zealand': /^\d{4}$/,
  'Switzerland': /^\d{4}$/,
  'Austria': /^\d{4}$/,
  'Belgium': /^\d{4}$/,
  'Luxembourg': /^\d{4}$/,
  'Ireland': /^[A-Z]\d{2}\s?[A-Z0-9]{4}$/i,
  'Portugal': /^\d{4}-\d{3}$/,
  'Greece': /^\d{3}\s?\d{2}$/,
  'Poland': /^\d{2}-\d{3}$/,
  'Czech Republic': /^\d{3}\s?\d{2}$/,
  'Hungary': /^\d{4}$/,
  'Slovakia': /^\d{3}\s?\d{2}$/,
  'Slovenia': /^\d{4}$/,
  'Croatia': /^\d{5}$/,
  'Serbia': /^\d{5}$/,
  'Bulgaria': /^\d{4}$/,
  'Romania': /^\d{6}$/,
  'Turkey': /^\d{5}$/,
  'Israel': /^\d{5}$/,
  'United Arab Emirates': /^\d{5}$/,
  'Saudi Arabia': /^\d{5}(-\d{4})?$/,
  'Russia': /^\d{6}$/,
  'Ukraine': /^\d{5}$/,
  'Belarus': /^\d{6}$/,
  'Kazakhstan': /^\d{6}$/,
  'Argentina': /^[A-Z]\d{4}[A-Z]{3}$/i,
  'Chile': /^\d{7}$/,
  'Colombia': /^\d{6}$/,
  'Peru': /^\d{5}$/,
  'Venezuela': /^\d{4}$/,
  'Ecuador': /^\d{6}$/,
  'Bolivia': /^\d{4}$/,
  'Uruguay': /^\d{5}$/,
  'Paraguay': /^\d{4}$/,
  'Egypt': /^\d{5}$/,
  'Morocco': /^\d{5}$/,
  'Tunisia': /^\d{4}$/,
  'Algeria': /^\d{5}$/,
  'Libya': /^\d{5}$/,
  'Kenya': /^\d{5}$/,
  'Nigeria': /^\d{6}$/,
  'Ghana': /^[A-Z]{2}-?\d{3}-?\d{4}$/i,
  'Ethiopia': /^\d{4}$/,
  'Tanzania': /^\d{5}$/,
  'Uganda': /^\d{5}$/,
  'Rwanda': /^\d{5}$/,
  'Zambia': /^\d{5}$/,
  'Zimbabwe': /^\d{5}$/,
  'Botswana': /^\d{5}$/,
  'Namibia': /^\d{5}$/,
  'Lesotho': /^\d{3}$/,
  'Swaziland': /^[A-Z]\d{3}$/i,
  'Mauritius': /^\d{5}$/,
  'Madagascar': /^\d{3}$/,
  'Seychelles': /^\d{5}$/,
  'Comoros': /^\d{3}$/,
  'Djibouti': /^\d{5}$/,
  'Eritrea': /^\d{6}$/,
  'Somalia': /^[A-Z]{2}\s?\d{5}$/i,
  'Sudan': /^\d{5}$/,
  'South Sudan': /^\d{5}$/,
  'Chad': /^\d{5}$/,
  'Central African Republic': /^\d{5}$/,
  'Cameroon': /^\d{5}$/,
  'Equatorial Guinea': /^\d{5}$/,
  'Gabon': /^\d{5}$/,
  'Republic of the Congo': /^\d{5}$/,
  'Democratic Republic of the Congo': /^\d{5}$/,
  'Angola': /^\d{4}$/,
  'Mozambique': /^\d{4}$/,
  'Malawi': /^\d{6}$/,
};

export const validateFullName = (name: string): FieldValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: 'Full name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }

  // Check for suspicious patterns
  if (/^\d+$/.test(name.trim())) {
    return { isValid: false, error: 'Please enter a valid name (letters only)' };
  }

  if (/^(test|fake|spam|temp|admin|user|demo|sample)/i.test(name.trim())) {
    return { isValid: false, error: 'Please enter your real name' };
  }

  // Check for minimum two words (first and last name)
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length < 2) {
    return { isValid: false, error: 'Please enter your full name (first and last name)' };
  }

  // Check for reasonable name length
  if (name.trim().length > 100) {
    return { isValid: false, error: 'Name is too long (maximum 100 characters)' };
  }

  // Check for special characters (allow only letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true };
};

export const validateEmail = (email: string): FieldValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email address is required' };
  }

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email format' };
  }

  // Check for disposable email domains
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { isValid: false, error: 'Please use a permanent email address (temporary emails not allowed)' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^\d+@/,  // Starts with only numbers
    /^test.*@/i, // Starts with "test"
    /^temp.*@/i, // Starts with "temp"
    /^fake.*@/i, // Starts with "fake"
    /^spam.*@/i, // Starts with "spam"
    /.*\+.*\+.*@/, // Multiple + signs
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email.toLowerCase())) {
      return { isValid: false, error: 'Please provide a valid personal or business email address' };
    }
  }

  // Check for common typos in popular domains
  const possibleTypos: { [key: string]: string } = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com'
  };

  if (domain && possibleTypos[domain]) {
    return {
      isValid: false,
      error: `Did you mean ${email.replace(domain, possibleTypos[domain])}?`
    };
  }

  return { isValid: true };
};

export const validatePassword = (password: string, confirmPassword?: string): FieldValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (maximum 128 characters)' };
  }

  // Check for password strength
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const strengthChecks = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar];
  const strengthScore = strengthChecks.filter(Boolean).length;

  if (strengthScore < 3) {
    return {
      isValid: false,
      error: 'Password must contain at least 3 of: uppercase letter, lowercase letter, number, special character'
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
    'password1', 'admin123', 'welcome123', 'letmein', 'monkey123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'This password is too common. Please choose a stronger password' };
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    return { isValid: false, error: 'Password cannot contain more than 2 consecutive identical characters' };
  }

  if (/123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    return { isValid: false, error: 'Password cannot contain sequential characters' };
  }

  // Confirm password validation
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  let warning = '';
  if (strengthScore === 3) {
    warning = 'Good password strength. Consider adding more character types for extra security.';
  }

  return { isValid: true, warning };
};

export const validatePhoneNumber = (phone: string, country?: string): FieldValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, '');

  // Check minimum length
  if (cleanPhone.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }

  if (cleanPhone.length > 15) {
    return { isValid: false, error: 'Phone number is too long (maximum 15 digits)' };
  }

  // Check for suspicious patterns
  if (/^(\d)\1{9,}$/.test(cleanPhone)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  const commonFakeNumbers = [
    '1234567890', '0987654321', '1111111111', '0000000000',
    '1234567891', '9876543210', '5555555555', '1212121212'
  ];

  if (commonFakeNumbers.includes(cleanPhone)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  // Country-specific validation
  if (country === 'India' && !cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    // Indian mobile numbers should start with 6,7,8,9
    if (!/^[6-9]/.test(cleanPhone)) {
      return { isValid: false, error: 'Please enter a valid Indian mobile number' };
    }
  }

  return { isValid: true };
};

export const validatePostalCode = (postalCode: string, country: string): FieldValidationResult => {
  if (!postalCode.trim()) {
    return { isValid: false, error: 'Postal code is required' };
  }

  const pattern = POSTAL_CODE_PATTERNS[country];
  if (pattern && !pattern.test(postalCode.trim())) {
    return {
      isValid: false,
      error: `Please enter a valid postal code for ${country}`
    };
  }

  return { isValid: true };
};

export const validateAddress = (address: string): FieldValidationResult => {
  if (!address.trim()) {
    return { isValid: false, error: 'Address is required' };
  }

  if (address.trim().length < 10) {
    return { isValid: false, error: 'Please enter a complete address (minimum 10 characters)' };
  }

  if (address.trim().length > 500) {
    return { isValid: false, error: 'Address is too long (maximum 500 characters)' };
  }

  // Check for suspicious patterns
  if (/^(test|fake|sample|demo|temp)/i.test(address.trim())) {
    return { isValid: false, error: 'Please enter your real address' };
  }

  return { isValid: true };
};

export const validateCity = (city: string): FieldValidationResult => {
  if (!city.trim()) {
    return { isValid: false, error: 'City is required' };
  }

  if (city.trim().length < 2) {
    return { isValid: false, error: 'City name must be at least 2 characters long' };
  }

  if (city.trim().length > 100) {
    return { isValid: false, error: 'City name is too long (maximum 100 characters)' };
  }

  // Check for valid city name format
  if (!/^[a-zA-Z\s\-'\.]+$/.test(city.trim())) {
    return { isValid: false, error: 'City name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true };
};

export const validateState = (state: string): FieldValidationResult => {
  if (!state.trim()) {
    return { isValid: false, error: 'State/Province is required' };
  }

  if (state.trim().length < 2) {
    return { isValid: false, error: 'State/Province name must be at least 2 characters long' };
  }

  if (state.trim().length > 100) {
    return { isValid: false, error: 'State/Province name is too long (maximum 100 characters)' };
  }

  // Check for valid state name format
  if (!/^[a-zA-Z\s\-'\.]+$/.test(state.trim())) {
    return { isValid: false, error: 'State/Province name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true };
};

export const validateCountry = (country: string): FieldValidationResult => {
  if (!country.trim()) {
    return { isValid: false, error: 'Country is required' };
  }

  return { isValid: true };
};

export const validateTimezone = (timezone: string): FieldValidationResult => {
  if (!timezone.trim()) {
    return { isValid: false, error: 'Timezone is required' };
  }

  return { isValid: true };
};

export const validateRegistrationForm = (formData: any, type: 'student' | 'teacher'): ValidationResult => {
  const errors: { [key: string]: string } = {};
  const warnings: { [key: string]: string } = {};

  // Validate common fields
  const nameValidation = validateFullName(formData.name || '');
  if (!nameValidation.isValid) errors.name = nameValidation.error!;

  const emailValidation = validateEmail(formData.email || '');
  if (!emailValidation.isValid) errors.email = emailValidation.error!;

  const passwordValidation = validatePassword(formData.password || '', formData.passwordConfirmation);
  if (!passwordValidation.isValid) errors.password = passwordValidation.error!;
  if (passwordValidation.warning) warnings.password = passwordValidation.warning;

  const phoneValidation = validatePhoneNumber(formData.contactNumber || '', formData.country);
  if (!phoneValidation.isValid) errors.contactNumber = phoneValidation.error!;

  const addressValidation = validateAddress(formData.address || '');
  if (!addressValidation.isValid) errors.address = addressValidation.error!;

  const cityValidation = validateCity(formData.city || '');
  if (!cityValidation.isValid) errors.city = cityValidation.error!;

  const stateValidation = validateState(formData.state || '');
  if (!stateValidation.isValid) errors.state = stateValidation.error!;

  const countryValidation = validateCountry(formData.country || '');
  if (!countryValidation.isValid) errors.country = countryValidation.error!;

  const postalCodeValidation = validatePostalCode(formData.postalCode || '', formData.country || '');
  if (!postalCodeValidation.isValid) errors.postalCode = postalCodeValidation.error!;

  const timezoneValidation = validateTimezone(formData.timezone || '');
  if (!timezoneValidation.isValid) errors.timezone = timezoneValidation.error!;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};