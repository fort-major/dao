import { Component } from "solid-js";
import { useLocation } from "@solidjs/router";
import { HomePage } from "@pages/home";
import { MePage } from "@pages/me";
import { TasksPage } from "@pages/tasks";
import { CreateUpdateTaskPage } from "@pages/create-new-task";
import { TaskPage } from "@pages/task";
import { HumansPage } from "@pages/humans";
import { FAQPage } from "@pages/faq";
import { WorkReportsPage } from "@pages/work-reports";
import { ReportWorkPage } from "@pages/report-work";
import { ViewWorkReportPage } from "@pages/view-work-report";

export interface IRoute {
  parent?: IRoute;
  component?: Component;
  $?: Record<string, IRoute | undefined>;
  path: string;
  pathSegment: string;
  features?: IRouteFeatures;
  redirectTo?: string;
}

function route<T>(r: T): T & IRoute {
  return r as T & IRoute;
}

export const ROOT = route({
  $: {
    "/": route({
      component: HomePage,
    }),
    tasks: route({
      $: {
        "/": route({
          component: TasksPage,
        }),
        create: route({
          component: CreateUpdateTaskPage,
        }),
        edit: route({
          component: CreateUpdateTaskPage,
        }),
      },
    }),
    task: route({
      component: TaskPage,
    }),
    contributions: route({
      $: {
        "/": route({
          //      component: WorkReportsPage,
          component: TasksPage,
        }),
        view: route({
          //       component: ViewWorkReportPage,
          component: TasksPage,
        }),
        report: route({
          //       component: ReportWorkPage,
          component: TasksPage,
        }),
      },
    }),
    humans: route({
      component: HumansPage,
    }),
    faq: route({
      component: FAQPage,
    }),
    me: route({
      component: MePage,
    }),
  },
});

// DO NOT REMOVE, THIS CHECKS IF THE ROUTES OF CORRECT TYPE, WHILE ALLOWING BETTER CODE COMPLETION
const _ROUTES_StaticTypeCheck: IRoute = ROOT;

// special features available at some route and __propagating downstream__
export interface IRouteFeatures<T extends boolean = boolean> {}

function defaultFeatures(): IRouteFeatures<boolean> {
  return {};
}

function enableFeatures(...k: (keyof IRouteFeatures)[]): {
  features: IRouteFeatures;
} {
  return {
    features: k.reduce(
      (prev, cur) => Object.assign(prev, { [cur]: true }),
      defaultFeatures()
    ),
  };
}

function mergeFeatures(
  f1: IRouteFeatures | undefined,
  f2: IRouteFeatures | undefined
): IRouteFeatures {
  return {};
}

function setRouteInfo(
  routeKey: string,
  route: IRoute,
  parent: IRoute | undefined
) {
  if (parent) {
    route.parent = parent;
    route.path =
      parent.path === "/"
        ? parent.path + routeKey
        : parent.path + "/" + routeKey;
    route.features = mergeFeatures(route.features, parent.features);
  } else {
    route.path = "/";
    route.features = mergeFeatures(route.features, {});
  }

  route.pathSegment = "/" + routeKey;

  if (route["$"]) {
    for (let subrouteKey in route["$"]) {
      setRouteInfo(subrouteKey, route["$"][subrouteKey]!, route);
    }
  }
}

setRouteInfo("", ROOT, undefined);

export function findRoute(path: string): IRoute | undefined {
  if (path === "/") return ROOT;

  const segments = path.split("/").filter((it) => it.trim().length > 0);

  let cur: IRoute = ROOT;

  for (let segment of segments) {
    const subroute = cur["$"]?.[segment];

    if (!subroute) return undefined;

    cur = subroute;
  }

  return cur;
}

export function useCurrentRouteProps<T>(): Readonly<T> | null {
  const { state } = useLocation<T>();

  return state as Readonly<T>;
}

export interface ISolidRoute {
  path: string;
  component?: Component;
  children?: ISolidRoute[];
}

export function getSolidRoutes(): ISolidRoute {
  return toSolidRoute(ROOT);
}

function toSolidRoute(route: IRoute): ISolidRoute {
  let children: ISolidRoute[] | undefined;

  if (route["$"]) {
    children = [];

    for (let subroute of Object.values(route["$"] as Record<string, IRoute>)) {
      children.push(toSolidRoute(subroute));
    }
  }

  return {
    path: route.pathSegment,
    component: route.component,
    children,
  };
}
