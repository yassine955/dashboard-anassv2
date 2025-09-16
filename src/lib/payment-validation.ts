// Payment validation utilities

export interface PaymentValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validatePaymentAmount(amount: number): PaymentValidationResult {
    const errors: string[] = [];

    if (amount <= 0) {
        errors.push('Bedrag moet groter zijn dan €0');
    }

    if (amount > 999999.99) {
        errors.push('Bedrag mag niet groter zijn dan €999,999.99');
    }

    // Check for reasonable decimal places (max 2)
    // Convert to string and check decimal places more reliably
    const amountStr = amount.toString();
    const decimalIndex = amountStr.indexOf('.');
    if (decimalIndex !== -1) {
        const decimalPlaces = amountStr.length - decimalIndex - 1;
        if (decimalPlaces > 3) {
            errors.push('Bedrag mag maximaal 2 decimalen hebben');
        }
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

    if (!invoice.totalAmount || invoice.totalAmount <= 0) {
        errors.push('Ongeldig factuurbedrag');
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
