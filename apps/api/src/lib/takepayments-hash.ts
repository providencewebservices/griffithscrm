import crypto from 'node:crypto';

// REQUEST hash field order (from TakePayments spec)
const REQUEST_FIELD_ORDER = [
	'PreSharedKey',
	'MerchantID',
	'Password',
	'Amount',
	'CurrencyCode',
	'EchoAVSCheckResult',
	'EchoCV2CheckResult',
	'EchoThreeDSecureAuthenticationCheckResult',
	'EchoCardType',
	'EchoCardNumberFirstSix',
	'EchoCardNumberLastFour',
	'EchoCardExpiryDate',
	'EchoDonationAmount',
	'AVSOverridePolicy',
	'CV2OverridePolicy',
	'ThreeDSecureOverridePolicy',
	'OrderID',
	'TransactionType',
	'TransactionDateTime',
	'CallbackURL',
	'OrderDescription',
	'CustomerName',
	'Address1',
	'Address2',
	'Address3',
	'Address4',
	'City',
	'State',
	'PostCode',
	'CountryCode',
	'EmailAddress',
	'PhoneNumber',
	'DateOfBirth',
	'EmailAddressEditable',
	'PhoneNumberEditable',
	'DateOfBirthEditable',
	'CV2Mandatory',
	'Address1Mandatory',
	'CityMandatory',
	'PostCodeMandatory',
	'StateMandatory',
	'CountryMandatory',
	'ResultDeliveryMethod',
	'ServerResultURL',
	'PaymentFormDisplaysResult',
	'PrimaryAccountName',
	'PrimaryAccountNumber',
	'PrimaryAccountDateOfBirth',
	'PrimaryAccountPostCode',
];

// RESPONSE hash field order (for verifying server result)
const RESPONSE_FIELD_ORDER = [
	'PreSharedKey',
	'MerchantID',
	'Password',
	'StatusCode',
	'Message',
	'PreviousStatusCode',
	'PreviousMessage',
	'CrossReference',
	'AddressNumericCheckResult',
	'PostCodeCheckResult',
	'CV2CheckResult',
	'ThreeDSecureAuthenticationCheckResult',
	'CardType',
	'CardClass',
	'CardIssuer',
	'CardIssuerCountryCode',
	'CardNumberFirstSix',
	'CardNumberLastFour',
	'CardExpiryDate',
	'Amount',
	'DonationAmount',
	'CurrencyCode',
	'OrderID',
	'TransactionType',
	'TransactionDateTime',
	'OrderDescription',
	'CustomerName',
	'Address1',
	'Address2',
	'Address3',
	'Address4',
	'City',
	'State',
	'PostCode',
	'CountryCode',
	'EmailAddress',
	'PhoneNumber',
	'DateOfBirth',
	'PrimaryAccountName',
	'PrimaryAccountNumber',
	'PrimaryAccountDateOfBirth',
	'PrimaryAccountPostCode',
];

// CALLBACK hash field order (for verifying customer redirect)
const CALLBACK_FIELD_ORDER = [
	'PreSharedKey',
	'MerchantID',
	'Password',
	'CrossReference',
	'OrderID',
];

type HashMethod = 'SHA1' | 'HMACSHA1';

function computeHash(
	fieldOrder: string[],
	fields: Record<string, string>,
	password: string,
	preSharedKey: string,
	hashMethod: HashMethod,
): string {
	// Build the full field map including credentials
	const allFields: Record<string, string> = {
		...fields,
		PreSharedKey: preSharedKey,
		Password: password,
	};

	if (hashMethod === 'SHA1') {
		// SHA1: Include PreSharedKey in the string, then SHA1 hash
		const str = fieldOrder.map((field) => `${field}=${allFields[field] ?? ''}`).join('&');
		return crypto.createHash('sha1').update(str).digest('hex');
	} else {
		// HMACSHA1: Exclude PreSharedKey from string, use it as HMAC key
		const fieldsWithoutPSK = fieldOrder.filter((f) => f !== 'PreSharedKey');
		const str = fieldsWithoutPSK.map((field) => `${field}=${allFields[field] ?? ''}`).join('&');
		return crypto.createHmac('sha1', preSharedKey).update(str).digest('hex');
	}
}

export function computeRequestHash(
	formFields: Record<string, string>,
	password: string,
	preSharedKey: string,
	hashMethod: HashMethod,
): string {
	return computeHash(REQUEST_FIELD_ORDER, formFields, password, preSharedKey, hashMethod);
}

export function verifyResponseHash(
	responseFields: Record<string, string>,
	password: string,
	preSharedKey: string,
	hashMethod: HashMethod,
	receivedHash: string,
): boolean {
	const computed = computeHash(
		RESPONSE_FIELD_ORDER,
		responseFields,
		password,
		preSharedKey,
		hashMethod,
	);
	return computed.toLowerCase() === receivedHash.toLowerCase();
}

export function verifyCallbackHash(
	callbackFields: Record<string, string>,
	password: string,
	preSharedKey: string,
	hashMethod: HashMethod,
	receivedHash: string,
): boolean {
	const computed = computeHash(
		CALLBACK_FIELD_ORDER,
		callbackFields,
		password,
		preSharedKey,
		hashMethod,
	);
	return computed.toLowerCase() === receivedHash.toLowerCase();
}
