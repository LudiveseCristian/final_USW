import React, { useState } from "react";
import { useAlert } from "../contexts/alertContext";
import { Mail, X, Send } from 'lucide-react';

const EmailModal = ({ recipient, onClose }) => {
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { showAlert } = useAlert();
    
    const handleSendEmail = async () => {
        if (!subject || !body) {
            showAlert("error", "Please enter both a subject and a message.");
            return;
        }

        setIsSending(true);
        try {
            // Replace with your actual backend endpoint
            const response = await fetch("http://localhost:5000/api/send-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    recipient: recipient,
                    subject: subject,
                    body: body,
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
                        <div className="flex items-center space-x-4">
                            <Mail className="h-8 w-8 text-green-600" />
                            <h2 className="text-2xl font-bold text-gray-800">
                                Compose Email
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
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
                                className="w-full p-4 border border-gray-300 rounded-lg text-sm transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                        </div>
                        <div className="relative">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Email body"
                                rows="8"
                                className="w-full p-4 border border-gray-300 rounded-lg text-sm transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
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
                            className="px-6 py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center space-x-2"
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