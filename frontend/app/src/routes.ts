import { Component, onMount } from "solid-js";
import { TestPage } from "./pages/test";
import { redirect, useNavigate } from "@solidjs/router";

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
  ],
});
