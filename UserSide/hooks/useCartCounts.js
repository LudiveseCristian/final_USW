"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"

export const useCartCount = () => {
  const { currentUser } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.uid) {
      setCartCount(0)
      setLoading(false)
      return
    }

    // Subscribe to products collection to count won bids for current user
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      let wonItemsCount = 0

      snapshot.docs.forEach((doc) => {
        const data = doc.data()

        // Find user's bid on this product
        const userBid = (data.bids || []).find((bid) => bid.bidderId === currentUser.uid)
        if (!userBid) return

        // Determine if user won: prefer explicit highestBidder, else compute
        const explicitWon =
          data.status === "sold" &&
          (data.highestBidder === userBid.bidderName || data.highestBidderId === currentUser.uid)

        let computedWon = false
        if (!explicitWon && Array.isArray(data.bids) && data.bids.length > 0) {
          const topBid = data.bids.reduce(
            (max, bid) => (bid.amount > (max?.amount || Number.NEGATIVE_INFINITY) ? bid : max),
            null,
          )
          computedWon = data.status === "sold" && topBid && topBid.bidderId === currentUser.uid
        }

        if (explicitWon || computedWon) {
          wonItemsCount++
        }
      })

      setCartCount(wonItemsCount)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  return { cartCount, loading }
}
