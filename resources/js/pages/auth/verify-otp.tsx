import { Head, router } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import React, { FormEventHandler, useEffect, useRef, useState } from 'react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/auth-layout';

interface VerifyOtpProps {
    email: string;
}

export default function VerifyOtp({ email }: VerifyOtpProps) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Focus first input on mount
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        
        if (!/^\d{6}$/.test(pastedData)) return;

        const newOtp = pastedData.split('');
        setOtp(newOtp);
        inputRefs.current[5]?.focus();
    };

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');

        if (otpValue.length !== 6) {
            setError('Please enter a 6-digit OTP');
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            const response = await axios.post(route('otp.verify'), { otp: otpValue }, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                withCredentials: true,
            });
            
            if (response.data.redirect) {
                window.location.href = response.data.redirect;
            }
        } catch (error: any) {
            if (error.response?.data?.errors?.otp) {
                setError(error.response.data.errors.otp[0]);
                
                // If session expired, redirect to login
                if (error.response.data.errors.otp[0].includes('Session expired')) {
                    setTimeout(() => {
                        router.visit(route('login'));
                    }, 2000);
                }
            } else {
                setError('An error occurred. Please try again.');
            }
            
            // Clear OTP on error
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        setIsResending(true);
        setError('');
        setResendMessage('');

        try {
            const response = await axios.post(route('otp.resend'), {}, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                withCredentials: true,
            });
            setResendMessage(response.data.message);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            
            // Clear success message after 5 seconds
            setTimeout(() => setResendMessage(''), 5000);
        } catch (error: any) {
            if (error.response?.data?.errors?.otp) {
                setError(error.response.data.errors.otp[0]);
                
                // If session expired, redirect to login
                if (error.response.data.errors.otp[0].includes('Session expired')) {
                    setTimeout(() => {
                        router.visit(route('login'));
                    }, 2000);
                }
            } else {
                setError('Failed to resend OTP. Please try again.');
            }
        } finally {
            setIsResending(false);
        }
    };

    return (
        <AuthLayout title="Verify your identity" description={`Enter the 6-digit code sent to ${email}`}>
            <Head title="Verify OTP" />

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                        <Input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            className="h-14 w-12 text-center text-xl font-semibold"
                            autoComplete="off"
                        />
                    ))}
                </div>

                {error && (
                    <div className="text-center text-sm text-red-600">
                        {error}
                    </div>
                )}

                {resendMessage && (
                    <div className="text-center text-sm text-green-600">
                        {resendMessage}
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting || otp.join('').length !== 6}>
                    {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Verify OTP
                </Button>

                <div className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground">
                        Didn't receive the code?{' '}
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={isResending}
                            className="font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50"
                        >
                            {isResending ? 'Resending...' : 'Resend OTP'}
                        </button>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => router.visit(route('login'))}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                            Back to login
                        </button>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
}

