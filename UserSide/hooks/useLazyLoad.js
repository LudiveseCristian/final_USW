import { useState, useCallback, useMemo } from 'react';

export const useLazyLoad = (items = [], itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Calculate visible items based on current page
  const visibleItems = useMemo(() => {
    return items.slice(0, currentPage * itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  // Check if there are more items to load
  const hasMore = useMemo(() => {
    return visibleItems.length < items.length;
  }, [visibleItems.length, items.length]);

  // Load more items function
  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      
      // Simulate loading delay (remove in production or adjust as needed)
      setTimeout(() => {
        setCurrentPage(prevPage => prevPage + 1);
        setIsLoadingMore(false);
      }, 500);
    }
  }, [hasMore, isLoadingMore]);

  // Reset pagination when items change (useful when switching tabs)
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setIsLoadingMore(false);
  }, []);

  // Manual trigger to load next page immediately
  const loadNextPage = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  }, [hasMore]);

  return {
    visibleItems,
    hasMore,
    isLoadingMore,
    loadMore,
    resetPagination,
    loadNextPage,
    currentPage,
    totalItems: items.length,
    loadedItems: visibleItems.length
  };
};