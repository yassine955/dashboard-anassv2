// Payment validation utilities

export interface PaymentValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validatePaymentAmount(amount: number | string): PaymentValidationResult {
    const errors: string[] = [];

    // Convert string to number if needed
    let numericAmount: number;
    if (typeof amount === 'string') {
        // Remove currency symbols and commas/periods used as thousand separators
        const cleanedAmount = amount
            .replace(/[€$£]/g, '') // Remove currency symbols
            .replace(/\s/g, '') // Remove spaces
            .replace(/\.(?=.*\.)/g, ''); // Remove thousand separators (keep last period as decimal)
        
        // Replace comma with period for decimal if needed
        const normalizedAmount = cleanedAmount.replace(',', '.');
        
        numericAmount = parseFloat(normalizedAmount);
        
        // If parsing failed, add error
        if (isNaN(numericAmount)) {
            errors.push('Ongeldig bedrag formaat');
            return { isValid: false, errors };
        }
    } else {
        numericAmount = amount;
    }

    if (numericAmount <= 0) {
        errors.push('Bedrag moet groter zijn dan €0');
    }

    if (numericAmount > 999999.99) {
        errors.push('Bedrag mag niet groter zijn dan €999,999.99');
    }

    // Check for reasonable decimal places (max 2)
    const decimalPlaces = (numericAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
        errors.push('Bedrag mag maximaal 2 decimalen hebben');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

export function validateInvoiceForPayment(invoice: any): PaymentValidationResult {
    const errors: string[] = [];

    if (!invoice) {
        errors.push('Factuur niet gevonden');
        return { isValid: false, errors };
    }

    if (invoice.status === 'paid') {
        errors.push('Deze factuur is al betaald');
    }

    if (invoice.status === 'cancelled') {
        errors.push('Deze factuur is geannuleerd');
    }

    // Validate amount
    if (!invoice.totalAmount || invoice.totalAmount <= 0) {
        errors.push('Ongeldig factuurbedrag');
    } else {
        const amountValidation = validatePaymentAmount(invoice.totalAmount);
        if (!amountValidation.isValid) {
            errors.push(...amountValidation.errors);
        }
    }

    // Check if invoice is not too old (more than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    if (invoice.invoiceDate && invoice.invoiceDate.toDate() < twoYearsAgo) {
        errors.push('Deze factuur is te oud om online te betalen');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

export function formatPaymentError(error: any): string {
    if (typeof error === 'string') {
        return error;
    }

    if (error?.message) {
        // Handle common Stripe errors
        switch (error.code) {
            case 'card_declined':
                return 'Uw kaart is geweigerd. Probeer een andere betaalmethode.';
            case 'expired_card':
                return 'Uw kaart is verlopen. Gebruik een andere kaart.';
            case 'incorrect_cvc':
                return 'De CVC-code is onjuist. Controleer uw kaartgegevens.';
            case 'processing_error':
                return 'Er is een verwerkingsfout opgetreden. Probeer het opnieuw.';
            case 'authentication_required':
                return 'Extra verificatie is vereist. Volg de instructies van uw bank.';
            default:
                return error.message;
        }
    }

    return 'Er is een onbekende fout opgetreden. Probeer het opnieuw.';
}

export function getPaymentMethodDisplayName(method: string): string {
    const methodNames: Record<string, string> = {
        card: 'Creditcard/Debitcard',
        ideal: 'iDEAL',
        sepa_debit: 'SEPA Direct Debit',
        sofort: 'SOFORT',
        bancontact: 'Bancontact',
        eps: 'EPS',
        giropay: 'Giropay',
        p24: 'Przelewy24',
        alipay: 'Alipay',
        wechat_pay: 'WeChat Pay',
    };

    return methodNames[method] || method;
}

export function isSupportedPaymentMethod(method: string): boolean {
    const supportedMethods = [
        'card',
        'ideal',
        'sepa_debit',
        'sofort',
        'bancontact',
        'eps',
        'giropay',
    ];

    return supportedMethods.includes(method);
}
