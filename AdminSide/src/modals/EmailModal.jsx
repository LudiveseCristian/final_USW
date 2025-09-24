import React, { useState, useEffect } from "react";
import { useAlert } from "../contexts/alertContext";
import { Mail, X, Send } from 'lucide-react';
import sanitizeHtml from 'sanitize-html';

const EmailModal = ({ recipient, onClose }) => {
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [htmlBody, setHtmlBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { showAlert } = useAlert();

    // The HTML-formatted footer
    const emailFooter = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-family: sans-serif; font-size: 14px; color: #666; text-align: center;">
            <p style="margin: 0; padding: 0;">---</p>
            <p style="margin: 0; padding: 0;">This email was sent from the administration panel of UpcycledStreetwear.</p>
            <p style="margin: 0; padding: 0;">If you have questions, please feel free to reply to this email, or DM us on our Instagram: <a href="https://www.instagram.com/upcycled_streetwear/" style="color: #22c55e; text-decoration: none;">upcycled_streetwear</a></p>
            <p style="margin-top: 20px; font-size: 12px; color: #999; margin-bottom: 0;">&copy; ${new Date().getFullYear()} UpcycledStreetwear. All rights reserved.</p>
        </div>
    `;

    // A simple function to convert plain text to HTML with line breaks and basic formatting
    const convertToHtml = (text) => {
        const sanitizedText = sanitizeHtml(text, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2', 'h3', 'p', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li' ])
        });
        return sanitizedText.replace(/\n/g, '<br />');
    };

    useEffect(() => {
        // This is the core change: creating a robust email template
        setHtmlBody(`
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style type="text/css">
                    /* Client-specific Styles */
                    div, p, a, li, td, span {
                        -webkit-text-size-adjust: none;
                    }
                    p {
                        margin: 0;
                    }
                </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F8F8F8; font-family: sans-serif;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F8F8;">
                    <tr>
                        <td style="padding: 20px 0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="600" style="margin: auto; border-radius: 12px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #EDECE4;">
                                <tr>
                                    <td style="padding: 30px;">
                                        <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 20px 0; color: #333333;">
                                            UpcycledStreetwear Admin
                                        </h1>
                                        <div style="font-family: sans-serif; color: #444444; line-height: 1.6; font-size: 16px;">
                                            <p style="margin: 0;">${convertToHtml(body)}</p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        ${emailFooter}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `);
    }, [body]);

    const handleSendEmail = async () => {
        if (!subject || !body) {
            showAlert("error", "Please enter both a subject and a message.");
            return;
        }

        setIsSending(true);
        try {
            const response = await fetch("http://localhost:5000/api/send-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    recipient: recipient,
                    subject: subject,
                    htmlBody: htmlBody, // Use the new htmlBody state
                }),
            });

            if (response.ok) {
                showAlert("success", "Email sent successfully!");
                onClose();
            } else {
                const errorData = await response.json();
                showAlert("error", errorData.error || "Failed to send email. Please try again.");
            }
        } catch (error) {
            console.error("Failed to send email:", error);
            showAlert("error", "Failed to connect to the server. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#FFFBF3] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#EDECE4]">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-6 border-b border-[#EDECE4] mb-6">
                        <div className="flex items-center space-x-4">
                            <Mail className="h-8 w-8 text-[#22c55e]" />
                            <h2 className="text-2xl font-bold text-gray-800">
                                Compose Email
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:bg-[#F3F2EE] rounded-full transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Recipient */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700">Recipient:</label>
                        <p className="mt-1 font-semibold text-gray-900">{recipient}</p>
                    </div>

                    {/* Email Form */}
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Subject"
                                className="w-full p-4 border border-[#DEDDDC] rounded-lg text-sm transition-colors focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] bg-white"
                            />
                        </div>
                        <div className="relative">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Email body"
                                rows="8"
                                className="w-full p-4 border border-[#DEDDDC] rounded-lg text-sm transition-colors focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] resize-none bg-white"
                            ></textarea>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 pt-6">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={isSending}
                            className="px-6 py-3 rounded-xl font-semibold text-white bg-[#22c55e] hover:bg-[#1f9f4a] disabled:bg-[#4dd278] transition-colors flex items-center space-x-2"
                        >
                            {isSending ? (
                                <>
                                    <span>Sending...</span>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </>
                            ) : (
                                <>
                                    <span>Send</span>
                                    <Send className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailModal;