import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, updateDoc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import ProfileAlertModal from '../AlertModal/ProfileAlertModal'; // Adjust path as needed

const DeliveryModal = ({ visible, onClose, productData, currentUser, conversationId }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        streetAddress: '',
        barangay: '',
        city: '',
        province: '',
        postalCode: '',
        landmark: '',
        deliveryNotes: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (visible && currentUser) {
            loadUserProfile();
        }
    }, [visible, currentUser]);

    const loadUserProfile = async () => {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Construct full name
                const fullName = userData.firstName && userData.lastName
                    ? userData.middleName
                        ? `${userData.firstName} ${userData.middleName} ${userData.lastName}`
                        : `${userData.firstName} ${userData.lastName}`
                    : userData.name || currentUser.name || '';

                // Parse address if it exists
                let addressData = {
                    streetAddress: '',
                    barangay: '',
                    city: '',
                    province: '',
                    postalCode: '',
                };

                if (userData.address) {
                    const addressParts = userData.address.split(',').map(part => part.trim());
                    if (addressParts.length >= 4) {
                        addressData.streetAddress = addressParts[0] || '';
                        addressData.barangay = addressParts[1] || '';
                        addressData.city = addressParts[2] || '';
                        const lastPart = addressParts[3] || '';
                        const postalMatch = lastPart.match(/\d{4}/);
                        addressData.postalCode = postalMatch ? postalMatch[0] : '';
                        addressData.province = lastPart.replace(/\d{4}/, '').trim();
                    }
                }

                setFormData({
                    fullName: fullName,
                    phoneNumber: userData.phone || '',
                    streetAddress: addressData.streetAddress,
                    barangay: addressData.barangay,
                    city: addressData.city,
                    province: addressData.province,
                    postalCode: addressData.postalCode,
                    landmark: '',
                    deliveryNotes: '',
                });
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
        } else if (!/^(09|\+639)\d{9}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
            newErrors.phoneNumber = 'Invalid Philippine phone number';
        }

        if (!formData.streetAddress.trim()) {
            newErrors.streetAddress = 'Street address is required';
        }

        if (!formData.barangay.trim()) {
            newErrors.barangay = 'Barangay is required';
        }

        if (!formData.city.trim()) {
            newErrors.city = 'City/Municipality is required';
        }

        if (!formData.province.trim()) {
            newErrors.province = 'Province is required';
        }

        if (!formData.postalCode.trim()) {
            newErrors.postalCode = 'Postal code is required';
        } else if (!/^\d{4}$/.test(formData.postalCode)) {
            newErrors.postalCode = 'Invalid postal code (4 digits)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setAlertModal({
                visible: true,
                type: 'error',
                title: 'Validation Error',
                message: 'Please fill in all required fields correctly.'
            });
            return;
        }

        try {
            setLoading(true);

            // Create delivery address object
            const deliveryAddress = {
                fullName: formData.fullName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                streetAddress: formData.streetAddress.trim(),
                barangay: formData.barangay.trim(),
                city: formData.city.trim(),
                province: formData.province.trim(),
                postalCode: formData.postalCode.trim(),
                landmark: formData.landmark.trim(),
                deliveryNotes: formData.deliveryNotes.trim(),
                timestamp: new Date().toISOString(),
            };

            // Create order in orders collection
            const orderData = {
                userId: currentUser.uid,
                productId: productData.productId || productData.id,
                productName: productData.productName || productData.name,
                productImage: productData.productImage || productData.imageUrl,
                finalBidAmount: productData.currentBid || productData.highestBid || productData.price || 0,
                deliveryAddress: deliveryAddress,
                status: 'pending_confirmation',
                orderType: 'won_bid',
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
            };

            const orderRef = await addDoc(collection(db, 'orders'), orderData);

            // Update product status
            if (productData.productId || productData.id) {
                const productRef = doc(db, 'products', productData.productId || productData.id);
                await updateDoc(productRef, {
                    status: 'sold',
                    deliveryConfirmed: true,
                    orderId: orderRef.id,
                });
            }

            // Send confirmation message to support chat
            if (conversationId) {
                const messagesRef = collection(db, 'conversations', conversationId, 'messages');
                await addDoc(messagesRef, {
                    senderId: currentUser.uid,
                    senderType: 'user',
                    text: `📦 Delivery address confirmed for "${productData.productName}"!\n\n` +
                          `📍 ${formData.streetAddress}, ${formData.barangay}, ${formData.city}, ${formData.province} ${formData.postalCode}\n` +
                          `📞 ${formData.phoneNumber}\n\n` +
                          `Order ID: ${orderRef.id}`,
                    timestamp: serverTimestamp(),
                    status: 'delivered',
                    type: 'delivery_confirmation',
                });

                // Update conversation
                const conversationRef = doc(db, 'conversations', conversationId);
                await updateDoc(conversationRef, {
                    lastMessage: 'Delivery address confirmed',
                    lastMessageTime: serverTimestamp(),
                });
            }

                setAlertModal({
                    visible: true,
                    type: 'success',
                    title: 'Success! 🎉',
                    message: 'Your delivery address has been confirmed. Our team will process your order shortly.'
                });

        } catch (error) {
            console.error('Error submitting delivery info:', error);
            setAlertModal({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to submit delivery information. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            fullName: '',
            phoneNumber: '',
            streetAddress: '',
            barangay: '',
            city: '',
            province: '',
            postalCode: '',
            landmark: '',
            deliveryNotes: '',
        });
        setErrors({});
        onClose();
    };

    const [alertModal, setAlertModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: ''
    });

    const renderInput = (label, field, placeholder, options = {}) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
                {label} {!options.optional && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                value={formData[field]}
                onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, [field]: text }));
                    if (errors[field]) {
                        setErrors(prev => ({ ...prev, [field]: null }));
                    }
                }}
                placeholder={placeholder}
                placeholderTextColor="#999"
                style={[
                    styles.input,
                    errors[field] && styles.inputError,
                    options.multiline && styles.textArea,
                ]}
                multiline={options.multiline}
                numberOfLines={options.numberOfLines}
                keyboardType={options.keyboardType || 'default'}
                maxLength={options.maxLength}
            />
            {errors[field] && (
                <Text style={styles.errorText}>{errors[field]}</Text>
            )}
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerLeft}>
                            <Icon name="local-shipping" size={24} color="#135918" />
                            <Text style={styles.modalTitle}>Delivery Address</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Product Info */}
                        {productData && (
                            <View style={styles.productCard}>
                                {productData.productImage && (
                                    <Image
                                        source={{ uri: productData.productImage }}
                                        style={styles.productImage}
                                        resizeMode="cover"
                                    />
                                )}
                                <View style={styles.productInfo}>
                                    <Text style={styles.productName} numberOfLines={2}>
                                        {productData.productName || 'Product'}
                                    </Text>
                                    <Text style={styles.productPrice}>
                                        ₱{(productData.currentBid || productData.highestBid || 0).toLocaleString()}
                                    </Text>
                                    <View style={styles.winBadge}>
                                        <Icon name="emoji-events" size={14} color="#FFD700" />
                                        <Text style={styles.winBadgeText}>You Won!</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                            {(formData.fullName || formData.phoneNumber) && (
                                <View style={styles.prefilledInfo}>
                                    <Icon name="check-circle" size={16} color="#4CAF50" />
                                    <Text style={styles.prefilledText}>
                                        Pre-filled from your profile
                                    </Text>
                                </View>
                            )}
                            {renderInput('Full Name', 'fullName', 'Juan Dela Cruz')}
                            {renderInput('Phone Number', 'phoneNumber', '09XX XXX XXXX', {
                                keyboardType: 'phone-pad',
                                maxLength: 15,
                            })}
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Delivery Address</Text>
                            {(formData.streetAddress || formData.city) && (
                                <View style={styles.prefilledInfo}>
                                    <Icon name="info-outline" size={16} color="#2196F3" />
                                    <Text style={styles.prefilledText}>
                                        Verify and complete your address
                                    </Text>
                                </View>
                            )}
                            {renderInput('Street Address', 'streetAddress', 'House No., Street Name', {
                                multiline: true,
                                numberOfLines: 2,
                            })}
                            {renderInput('Barangay', 'barangay', 'Barangay Name')}
                            
                            <View style={styles.rowInputs}>
                                <View style={styles.halfInput}>
                                    {renderInput('City/Municipality', 'city', 'City')}
                                </View>
                                <View style={styles.halfInput}>
                                    {renderInput('Province', 'province', 'Province')}
                                </View>
                            </View>

                            {renderInput('Postal Code', 'postalCode', '1234', {
                                keyboardType: 'number-pad',
                                maxLength: 4,
                            })}
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
                            {renderInput('Landmark', 'landmark', 'Near church, mall, etc.', {
                                optional: true,
                            })}
                            {renderInput('Delivery Notes', 'deliveryNotes', 'Special instructions for delivery...', {
                                optional: true,
                                multiline: true,
                                numberOfLines: 3,
                                maxLength: 200,
                            })}
                        </View>

                        <View style={styles.infoBox}>
                            <Icon name="info-outline" size={20} color="#135918" />
                            <Text style={styles.infoText}>
                                Please ensure your delivery address is accurate. Our team will contact you for order confirmation.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleClose}
                            disabled={loading}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Icon name="check-circle" size={20} color="white" />
                                    <Text style={styles.submitButtonText}>Confirm Address</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

             <ProfileAlertModal
                visible={alertModal.visible}
                onClose={() => {
                    setAlertModal({ ...alertModal, visible: false });
                    if (alertModal.type === 'success') {
                        handleClose();
                    }
                }}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFCF3',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#135918',
        marginLeft: 10,
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 12,
    },
    productInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#135918',
        marginBottom: 6,
    },
    winBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff9e6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    winBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ff8800',
        marginLeft: 4,
    },
    formSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#135918',
        marginBottom: 12,
    },
    prefilledInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    prefilledText: {
        fontSize: 12,
        color: '#2E7D32',
        marginLeft: 8,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    required: {
        color: '#ff4444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        backgroundColor: 'white',
        color: '#333',
    },
    inputError: {
        borderColor: '#ff4444',
    },
    textArea: {
        minHeight: 60,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    errorText: {
        fontSize: 11,
        color: '#ff4444',
        marginTop: 4,
        marginLeft: 4,
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: -16,
    },
    halfInput: {
        width: '48%',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#f0f9f0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#d0e8d0',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#135918',
        marginLeft: 10,
        lineHeight: 18,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    submitButton: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#135918',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#135918',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
    },
});

export default DeliveryModal;