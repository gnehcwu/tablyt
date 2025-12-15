import { useEffect } from 'react';

export default function useChromeMessage(action: string, callback: () => void): void {
  useEffect(() => {
    const messageListener = (request: { action: string }, _: any, sendResponse: () => void) => {
      if (request.action === action) {
        callback();
        sendResponse();
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [action, callback]);
}
