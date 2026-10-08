// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes:
        | `/`
        | `/_sitemap`
        | `/circle/new`
        | `/circles`
        | `/event/new`
        | `/join`
        | `/profile`
      DynamicRoutes:
        | `/circle/${OneRouter.SingleRoutePart<T>}`
        | `/event/${OneRouter.SingleRoutePart<T>}`
        | `/u/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate:
        | `/circle/[coord]`
        | `/event/[id]`
        | `/u/[npub]`
      IsTyped: true
      RouteTypes: {
        '/circle/[coord]': RouteInfo<{ coord: string }>
        '/event/[id]': RouteInfo<{ id: string }>
        '/u/[npub]': RouteInfo<{ npub: string }>
      }
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; search?: string; subdomain?: string; params: Params; request?: Request }
}