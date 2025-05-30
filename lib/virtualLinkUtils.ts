/**
 * Utility functions for handling virtual event links
 */

/**
 * Detects the platform from a virtual event link
 * @param url The URL to analyze
 * @returns The detected platform name or "Other" if unknown
 */
export function detectPlatform(url: string): string {
  if (!url) return "Other";

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check for known video conferencing platforms
    if (hostname.includes('zoom.us') || hostname.includes('zoom.com')) {
      return 'Zoom';
    } else if (hostname.includes('meet.google.com')) {
      return 'Google Meet';
    } else if (hostname.includes('teams.microsoft.com')) {
      return 'Microsoft Teams';
    } else if (hostname.includes('webex.com')) {
      return 'Cisco Webex';
    } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'YouTube';
    } else if (hostname.includes('vimeo.com')) {
      return 'Vimeo';
    } else if (hostname.includes('twitch.tv')) {
      return 'Twitch';
    } else if (hostname.includes('facebook.com')) {
      return 'Facebook Live';
    } else if (hostname.includes('instagram.com')) {
      return 'Instagram Live';
    } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'Twitter/X';
    } else if (hostname.includes('discord.com') || hostname.includes('discord.gg')) {
      return 'Discord';
    } else if (hostname.includes('skype.com')) {
      return 'Skype';
    } else if (hostname.includes('clubhouse.com')) {
      return 'Clubhouse';
    } else if (hostname.includes('spaces.zumzi.com')) {
      return 'Zumzi';
    }
    
    // Return the hostname if no specific platform is detected
    return hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() + 
           hostname.replace('www.', '').split('.')[0].slice(1);
  } catch (error) {
    // Return 'Other' if URL is invalid
    return 'Other';
  }
}

/**
 * Validates if a string is a valid URL
 * @param url The URL to validate
 * @returns boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}
