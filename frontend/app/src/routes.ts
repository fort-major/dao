import { Component, onMount } from "solid-js";
import { TestPage } from "./pages/test";
import { redirect } from "@solidjs/router";
import { HumansPage } from "./pages/humans";

export type IRoute = {
  path: string | string[];
  component?: Component;
  children?: IRoute[];
};

export function route<T extends IRoute>(r: T): T {
  return r;
}

export const ROOT = route({
  path: "/",
  children: [
    route({
      path: "/",
      component: () => {
        onMount(() => {
          redirect("/test");
        });

        return undefined;
      },
    }),
    route({
      path: "/test",
      component: TestPage,
    }),
    route({
      path: "/humans",
      component: HumansPage,
    }),
  ],
});
