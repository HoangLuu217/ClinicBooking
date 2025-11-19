import { useEffect } from 'react';

// Custom hook để scroll to top khi component mount
const useScrollToTop = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
};

export default useScrollToTop;
