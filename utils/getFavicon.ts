export default function getFavicon(url: string) {
  try {
    const faviconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
    faviconUrl.searchParams.set('pageUrl', url);
    faviconUrl.searchParams.set('size', '32');
    return faviconUrl.toString();
  } catch (error) {
    return '';
  }
}
