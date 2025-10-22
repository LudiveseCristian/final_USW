"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"

export const useCartCount = () => {
  const { currentUser } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [wonProductIds, setWonProductIds] = useState([])

  useEffect(() => {
    if (!currentUser?.uid) {
      setCartCount(0)
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      let wonItemsCount = 0
      const currentWonIds = []

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const productId = doc.id

        const bidsArray = Array.isArray(data.bids) ? data.bids : []
        const userBid = bidsArray.find((bid) => bid.bidderId === currentUser.uid)
        const topBid = bidsArray.reduce(
          (max, bid) => (bid.amount > (max?.amount || Number.NEGATIVE_INFINITY) ? bid : max),
          null,
        )

        const explicitWon =
          data.status === "sold" && (
            (userBid && data.highestBidder === userBid.bidderName) ||
            data.highestBidderId === currentUser.uid ||
            data.winnerBidderId === currentUser.uid
          )

        const computedWon = data.status === "sold" && topBid && topBid.bidderId === currentUser.uid

        if (explicitWon || computedWon) {
          currentWonIds.push(productId)
          const viewed = data?.wonStatusByUser?.[currentUser.uid] === "viewed"
          if (!viewed) {
            wonItemsCount++
          }
        }
      })

      setWonProductIds(currentWonIds)
      setCartCount(wonItemsCount)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  // Reset cart count to zero
  const resetCartCount = useCallback(() => {
    setCartCount(0) // Immediately set count to zero for UI update
  }, [])

  return {
    cartCount,
    loading,
    resetCartCount,
  }
}