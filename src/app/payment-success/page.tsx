'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService } from '@/lib/firebase-service';
import { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast-with-notification';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { currentUser, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [error, setError] = useState<string | null>(null);

    const invoiceId = searchParams.get('invoice');
    const paymentStatus = searchParams.get('payment');
    const provider = searchParams.get('provider');

    useEffect(() => {
        if (!invoiceId) {
            setLoading(false);
            return;
        }

        const loadInvoice = async () => {
            try {
                // Get invoice details - this will work even without authentication
                // as we're just displaying invoice info, not modifying user data
                // For payment success pages, we allow access to invoice data for display purposes
                const invoiceData = await invoiceService.getInvoice(invoiceId);
                if (invoiceData) {
                    setInvoice(invoiceData);

                    // If payment was successful and invoice is not already marked as paid, update it
                    // Note: This update happens without user verification since it's a payment completion
                    if (paymentStatus === 'success' && invoiceData.status !== 'paid') {
                        try {
                            await invoiceService.updateInvoice(invoiceId, {
                                status: 'paid'
                            });
                            console.log(`Invoice ${invoiceId} marked as paid from success page`);
                            toast.success('Betaling bevestigd! Factuur is gemarkeerd als betaald.');
                        } catch (updateError) {
                            console.error('Error updating invoice status:', updateError);
                            // Don't show error to client, just log it
                        }
                    }
                } else {
                    setError('Factuur niet gevonden');
                }
            } catch (err) {
                console.error('Error loading invoice:', err);
                setError('Er is een fout opgetreden bij het laden van de factuur');
            } finally {
                setLoading(false);
            }
        };

        loadInvoice();
    }, [invoiceId, paymentStatus]);

    // Check if the current user is the owner of this invoice (authorized to access dashboard)
    const isInvoiceOwner = currentUser && invoice && invoice.userId === currentUser.uid;

    const handleGoToPayments = () => {
        if (isInvoiceOwner) {
            router.push('/dashboard/payments');
        } else {
            // For clients or unauthorized users, just show a message
            toast.success('Bedankt voor uw betaling!');
        }
    };

    const handleGoToInvoices = () => {
        if (isInvoiceOwner) {
            router.push('/dashboard/invoices');
        } else {
            // For clients or unauthorized users, just show a message
            toast.success('Bedankt voor uw betaling!');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md mx-auto">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <CardTitle className="text-red-600">Fout</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-gray-600 mb-6">{error}</p>
                            <Button onClick={() => window.close()} className="w-full">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Sluiten
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const isSuccess = paymentStatus === 'success';
    const isCancelled = paymentStatus === 'cancelled';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Card>
                        <CardHeader className="text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isSuccess ? 'bg-green-100' : 'bg-yellow-100'
                                    }`}
                            >
                                {isSuccess ? (
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                                )}
                            </motion.div>

                            <CardTitle className={isSuccess ? 'text-green-600' : 'text-yellow-600'}>
                                {isSuccess ? 'Betaling Succesvol!' : 'Betaling Geannuleerd'}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="text-center space-y-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                {isSuccess ? (
                                    <>
                                        <p className="text-gray-600">
                                            Uw betaling is succesvol verwerkt. U ontvangt binnenkort een bevestiging per email.
                                        </p>
                                        {invoice && (
                                            <div className="mt-4 p-4 bg-green-50 rounded-lg">
                                                <p className="text-sm text-green-800">
                                                    <strong>Factuur:</strong> {invoice.invoiceNumber}
                                                </p>
                                                <p className="text-sm text-green-800">
                                                    <strong>Bedrag:</strong> €{invoice.totalAmount.toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-gray-600">
                                            De betaling is geannuleerd. U kunt opnieuw proberen te betalen wanneer u klaar bent.
                                        </p>
                                        {invoice && (
                                            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                                                <p className="text-sm text-yellow-800">
                                                    <strong>Factuur:</strong> {invoice.invoiceNumber}
                                                </p>
                                                <p className="text-sm text-yellow-800">
                                                    <strong>Bedrag:</strong> €{invoice.totalAmount.toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="space-y-3"
                            >
                                {isSuccess ? (
                                    <>
                                        {isInvoiceOwner ? (
                                            <>
                                                <Button onClick={handleGoToInvoices} className="w-full">
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Bekijk Facturen
                                                </Button>
                                                <Button onClick={handleGoToPayments} variant="outline" className="w-full">
                                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                                    Terug naar Betalingen
                                                </Button>
                                            </>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() => {
                                                if (isInvoiceOwner) {
                                                    router.push(`/dashboard/invoices`);
                                                } else {
                                                    toast.error('Neem contact op met de factuurverstrekker.');
                                                }
                                            }}
                                            className="w-full"
                                        >
                                            Opnieuw Betalen
                                        </Button>
                                        <Button onClick={() => window.close()} variant="outline" className="w-full">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Sluiten
                                        </Button>
                                    </>
                                )}
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
