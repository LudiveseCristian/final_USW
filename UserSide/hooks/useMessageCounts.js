"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"

export const useMessageCount = () => {
  const { currentUser } = useAuth()
  const [messageCount, setMessageCount] = useState(0)
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.uid) {
      setMessageCount(0)
      setConversationId(null)
      setLoading(false)
      return
    }

    // Query for user's conversation
    const conversationsRef = collection(db, "conversations")
    const q = query(conversationsRef, where("participants", "array-contains", currentUser.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setMessageCount(0)
        setConversationId(null)
        setLoading(false)
        return
      }

      // Get the first (should be only) conversation for this user
      const conversationDoc = snapshot.docs[0]
      const data = conversationDoc.data()
      
      setConversationId(conversationDoc.id)
      
      // Get unread count for this user from conversation
      const conversationUnreadCount = data?.unreadCount?.[currentUser.uid] || 0
      
      // Set the total message count
      setMessageCount(conversationUnreadCount)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  // Reset message count to zero
  const resetMessageCount = useCallback(async () => {
    if (!conversationId || !currentUser?.uid) return

    setMessageCount(0) // Immediately set count to zero for UI update

    try {
      const conversationRef = doc(db, "conversations", conversationId)
      await updateDoc(conversationRef, {
        [`unreadCount.${currentUser.uid}`]: 0,
      })
    } catch (error) {
      console.warn("Failed to reset message count:", error)
    }
  }, [conversationId, currentUser?.uid])

  return {
    messageCount,
    loading,
    resetMessageCount,
    conversationId,
  }
}