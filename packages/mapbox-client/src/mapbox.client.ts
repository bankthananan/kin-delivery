import axios, { AxiosInstance } from 'axios';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteResult {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

export interface DistanceResult {
  distanceMeters: number;
  durationSeconds: number;
}

export class MapboxClient {
  private readonly http: AxiosInstance;
  private readonly accessToken: string;
  private readonly baseUrl = 'https://api.mapbox.com';

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? process.env.MAPBOX_ACCESS_TOKEN ?? '';
    if (!this.accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is required');
    }

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async geocode(address: string): Promise<Coordinates> {
    const encoded = encodeURIComponent(address);
    const url = `/geocoding/v5/mapbox.places/${encoded}.json`;

    const response = await this.http.get(url, {
      params: {
        access_token: this.accessToken,
        limit: 1,
      },
    });

    const features = response.data?.features;
    if (!features || features.length === 0) {
      throw new Error(`No geocoding results for address: ${address}`);
    }

    const [lng, lat] = features[0].center;
    return { lat, lng };
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = `/geocoding/v5/mapbox.places/${lng},${lat}.json`;

    const response = await this.http.get(url, {
      params: {
        access_token: this.accessToken,
        limit: 1,
      },
    });

    const features = response.data?.features;
    if (!features || features.length === 0) {
      throw new Error(`No reverse geocoding results for coordinates: ${lat}, ${lng}`);
    }

    return features[0].place_name as string;
  }

  async getDistance(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<DistanceResult> {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `/directions/v5/mapbox/driving/${coordinates}`;

    const response = await this.http.get(url, {
      params: {
        access_token: this.accessToken,
        geometries: 'geojson',
      },
    });

    const routes = response.data?.routes;
    if (!routes || routes.length === 0) {
      throw new Error('No route found between origin and destination');
    }

    const route = routes[0];
    return {
      distanceMeters: route.distance as number,
      durationSeconds: route.duration as number,
    };
  }

  async getRouteWithWaypoints(waypoints: Coordinates[]): Promise<RouteResult> {
    if (waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required');
    }

    const coordinates = waypoints
      .map((wp) => `${wp.lng},${wp.lat}`)
      .join(';');

    const url = `/directions/v5/mapbox/driving/${coordinates}`;

    const response = await this.http.get(url, {
      params: {
        access_token: this.accessToken,
        geometries: 'geojson',
      },
    });

    const routes = response.data?.routes;
    if (!routes || routes.length === 0) {
      throw new Error('No route found for the given waypoints');
    }

    const route = routes[0];
    return {
      totalDistanceMeters: route.distance as number,
      totalDurationSeconds: route.duration as number,
    };
  }
}
