export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; height: number; width: number }>;
  followers: { total: number };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  uri: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  tracks: {
    total: number;
    items: Array<{ track: SpotifyTrack; added_at: string }>;
  };
  external_urls: { spotify: string };
  images: Array<{ url: string; height: number; width: number }>;
  owner: {
    id: string;
    display_name: string;
  };
}

export interface SpotifySearchResults {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

export interface SpotifyAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export class SpotifyService {
  private static readonly CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  private static readonly REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  private static readonly SCOPES = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'user-read-email',
    'user-library-read',
    'user-read-playback-state'
  ];

  private static tokenCache = new Map<string, { tokens: SpotifyAuthTokens; expiresAt: number }>();

  /**
   * Generate Spotify OAuth authorization URL
   */
  static getAuthUrl(state?: string): string {
    if (!this.CLIENT_ID || !this.REDIRECT_URI) {
      throw new Error('Spotify CLIENT_ID and REDIRECT_URI must be configured');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      scope: this.SCOPES.join(' '),
      redirect_uri: this.REDIRECT_URI,
      state: state || 'gift-platform'
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params}`;
    console.log('🔗 Generated Spotify auth URL');
    return authUrl;
  }

  /**
   * Exchange authorization code for access tokens
   */
  static async getAccessTokens(code: string): Promise<SpotifyAuthTokens> {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET || !this.REDIRECT_URI) {
      throw new Error('Spotify credentials not properly configured');
    }

    try {
      console.log('🔄 Exchanging Spotify authorization code for tokens...');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.REDIRECT_URI
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Spotify token exchange failed: ${errorData}`);
      }

      const tokens: SpotifyAuthTokens = await response.json();
      
      // Cache tokens with expiration
      const expiresAt = Date.now() + (tokens.expires_in * 1000);
      this.tokenCache.set(tokens.access_token, { tokens, expiresAt });

      console.log('✅ Spotify tokens obtained successfully');
      return tokens;

    } catch (error) {
      console.error('❌ Error getting Spotify access tokens:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get Spotify tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<SpotifyAuthTokens> {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new Error('Spotify credentials not properly configured');
    }

    try {
      console.log('🔄 Refreshing Spotify access token...');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Spotify token refresh failed: ${errorData}`);
      }

      const tokens: Partial<SpotifyAuthTokens> = await response.json();
      
      // Refresh token might not be returned, use the existing one
      const fullTokens: SpotifyAuthTokens = {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || refreshToken,
        expires_in: tokens.expires_in!,
        token_type: tokens.token_type!,
        scope: tokens.scope!
      };

      // Update cache
      const expiresAt = Date.now() + (fullTokens.expires_in * 1000);
      this.tokenCache.set(fullTokens.access_token, { tokens: fullTokens, expiresAt });

      console.log('✅ Spotify access token refreshed');
      return fullTokens;

    } catch (error) {
      console.error('❌ Error refreshing Spotify token:', error);
      throw new Error('Failed to refresh Spotify token');
    }
  }

  /**
   * Get current user's Spotify profile
   */
  static async getCurrentUser(accessToken: string): Promise<SpotifyUser> {
    try {
      console.log('🔄 Fetching Spotify user profile...');

      const response = await this.makeAuthenticatedRequest(
        'https://api.spotify.com/v1/me',
        accessToken
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }

      const user: SpotifyUser = await response.json();
      console.log('✅ Spotify user profile fetched:', user.display_name);
      return user;

    } catch (error) {
      console.error('❌ Error fetching Spotify user:', error);
      throw new Error('Failed to fetch Spotify user profile');
    }
  }

  /**
   * Create a new playlist
   */
  static async createPlaylist(
    accessToken: string,
    userId: string,
    name: string,
    description: string = '',
    isPublic: boolean = false
  ): Promise<SpotifyPlaylist> {
    try {
      console.log('🔄 Creating Spotify playlist:', name);

      const response = await this.makeAuthenticatedRequest(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            description,
            public: isPublic,
            collaborative: false
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create playlist: ${errorData}`);
      }

      const playlist: SpotifyPlaylist = await response.json();
      console.log('✅ Spotify playlist created:', playlist.id);
      return playlist;

    } catch (error) {
      console.error('❌ Error creating Spotify playlist:', error);
      throw new Error('Failed to create Spotify playlist');
    }
  }

  /**
   * Search for tracks
   */
  static async searchTracks(
    accessToken: string,
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SpotifySearchResults> {
    try {
      console.log('🔄 Searching Spotify tracks:', query);

      const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: limit.toString(),
        offset: offset.toString(),
        market: 'NG' // Nigerian market
      });

      const response = await this.makeAuthenticatedRequest(
        `https://api.spotify.com/v1/search?${params}`,
        accessToken
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to search tracks: ${errorData}`);
      }

      const results: SpotifySearchResults = await response.json();
      console.log('✅ Spotify search completed:', results.tracks.items.length, 'tracks found');
      return results;

    } catch (error) {
      console.error('❌ Error searching Spotify tracks:', error);
      throw new Error('Failed to search Spotify tracks');
    }
  }

  /**
   * Add tracks to playlist
   */
  static async addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackUris: string[]
  ): Promise<{ snapshot_id: string }> {
    try {
      console.log('🔄 Adding tracks to Spotify playlist:', playlistId, trackUris.length, 'tracks');

      if (trackUris.length === 0) {
        throw new Error('No tracks to add');
      }

      if (trackUris.length > 100) {
        throw new Error('Cannot add more than 100 tracks at once');
      }

      const response = await this.makeAuthenticatedRequest(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            uris: trackUris
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to add tracks: ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Tracks added to Spotify playlist');
      return result;

    } catch (error) {
      console.error('❌ Error adding tracks to playlist:', error);
      throw new Error('Failed to add tracks to playlist');
    }
  }

  /**
   * Get playlist details
   */
  static async getPlaylist(
    accessToken: string,
    playlistId: string,
    includeMarket: string = 'NG'
  ): Promise<SpotifyPlaylist> {
    try {
      console.log('🔄 Fetching Spotify playlist:', playlistId);

      const params = new URLSearchParams({
        market: includeMarket,
        fields: 'id,name,description,public,collaborative,tracks.total,tracks.items(track(id,name,artists,album,duration_ms,preview_url,external_urls,uri),added_at),external_urls,images,owner'
      });

      const response = await this.makeAuthenticatedRequest(
        `https://api.spotify.com/v1/playlists/${playlistId}?${params}`,
        accessToken
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch playlist: ${errorData}`);
      }

      const playlist: SpotifyPlaylist = await response.json();
      console.log('✅ Spotify playlist fetched:', playlist.name);
      return playlist;

    } catch (error) {
      console.error('❌ Error fetching Spotify playlist:', error);
      throw new Error('Failed to fetch Spotify playlist');
    }
  }

  /**
   * Remove tracks from playlist
   */
  static async removeTracksFromPlaylist(
    accessToken: string,
    playlistId: string,
    trackUris: string[]
  ): Promise<{ snapshot_id: string }> {
    try {
      console.log('🔄 Removing tracks from Spotify playlist:', playlistId, trackUris.length, 'tracks');

      const response = await this.makeAuthenticatedRequest(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        accessToken,
        {
          method: 'DELETE',
          body: JSON.stringify({
            uris: trackUris
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to remove tracks: ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Tracks removed from Spotify playlist');
      return result;

    } catch (error) {
      console.error('❌ Error removing tracks from playlist:', error);
      throw new Error('Failed to remove tracks from playlist');
    }
  }

  /**
   * Get user's playlists
   */
  static async getUserPlaylists(
    accessToken: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ items: SpotifyPlaylist[]; total: number }> {
    try {
      console.log('🔄 Fetching user Spotify playlists...');

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await this.makeAuthenticatedRequest(
        `https://api.spotify.com/v1/me/playlists?${params}`,
        accessToken
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch playlists: ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ User Spotify playlists fetched:', result.items.length);
      return result;

    } catch (error) {
      console.error('❌ Error fetching user playlists:', error);
      throw new Error('Failed to fetch user playlists');
    }
  }

  /**
   * Get popular tracks for gift playlists
   */
  static async getPopularTracks(
    accessToken: string,
    category: string = 'party',
    limit: number = 20
  ): Promise<SpotifyTrack[]> {
    try {
      console.log('🔄 Fetching popular tracks for category:', category);

      // Search for popular tracks in the category
      const query = this.getCategoryQuery(category);
      const results = await this.searchTracks(accessToken, query, limit);

      console.log('✅ Popular tracks fetched for category:', category);
      return results.tracks.items;

    } catch (error) {
      console.error('❌ Error fetching popular tracks:', error);
      throw new Error('Failed to fetch popular tracks');
    }
  }

  /**
   * Validate token and refresh if needed
   */
  static async ensureValidToken(accessToken: string, refreshToken: string): Promise<string> {
    const cachedToken = this.tokenCache.get(accessToken);
    
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return accessToken;
    }

    // Token expired or not cached, refresh it
    console.log('🔄 Token expired, refreshing...');
    const newTokens = await this.refreshAccessToken(refreshToken);
    return newTokens.access_token;
  }

  /**
   * Make authenticated request to Spotify API
   */
  private static async makeAuthenticatedRequest(
    url: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const defaultHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });
  }

  /**
   * Get search query for different gift categories
   */
  private static getCategoryQuery(category: string): string {
    const categoryQueries: Record<string, string> = {
      birthday: 'birthday happy celebration party',
      wedding: 'wedding love romantic celebration',
      anniversary: 'anniversary love romantic',
      graduation: 'graduation achievement success',
      party: 'party dance celebration',
      relaxing: 'chill relaxing ambient',
      african: 'afrobeats nigerian african music',
      gospel: 'gospel praise worship',
      rnb: 'rnb soul rhythm blues',
      pop: 'pop top hits popular',
      default: 'happy celebration party music'
    };

    return categoryQueries[category.toLowerCase()] || categoryQueries.default;
  }

  /**
   * Clear token cache
   */
  static clearTokenCache(): void {
    this.tokenCache.clear();
    console.log('✅ Spotify token cache cleared');
  }

  /**
   * Get cached tokens (for debugging)
   */
  static getCachedTokens(): Array<{ token: string; expiresAt: number }> {
    return Array.from(this.tokenCache.entries()).map(([token, data]) => ({
      token: token.substring(0, 20) + '...',
      expiresAt: data.expiresAt
    }));
  }
}

export default SpotifyService;