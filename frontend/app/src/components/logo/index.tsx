export interface ILogoProps {
  w?: number;
  h?: number;
  class?: string;
}

export function Logo(props: ILogoProps) {
  return (
    <svg
      width={props.w ? props.w : 125}
      height={props.h ? props.h : 52}
      viewBox="0 0 125 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={props.class}
    >
      <path
        d="M31.6557 8.58371L32.907 1H1V51H10.0596V31.0665H27.9455L29.1793 23.5849H10.0596V8.58371H31.6557ZM100.653 1V9.28958H109.715V1H100.653ZM100.653 13.306V43.4163H86.3984L85.1413 51H109.715V13.306H100.653ZM31.6557 8.58371L32.907 1ZM89.3182 1L81.0636 51H72.3394L78.0768 16.637H77.6393L58.1112 50.8308H51.6329L43.5475 16.5699H43.11L37.3056 51H28.6135L36.903 1H48.0103L56.8686 37.2093H57.4724L78.278 1H89.3182Z"
        fill="white"
        stroke="white"
      />
      <path
        d="M114.715 51V37C114.715 35.9391 115.137 34.9217 115.887 34.1716C116.637 33.4214 117.655 33 118.715 33H119.215C120.144 33 121.034 33.3687 121.69 34.0251C122.347 34.6815 122.715 35.5717 122.715 36.5C122.715 37.4283 122.347 38.3185 121.69 38.9749C121.034 39.6313 120.144 40 119.215 40M119.215 40H118.715M119.215 40C120.105 40 120.975 40.2639 121.716 40.7584C122.456 41.2529 123.032 41.9557 123.373 42.7779C123.714 43.6002 123.803 44.505 123.629 45.3779C123.455 46.2508 123.027 47.0526 122.397 47.682C121.768 48.3113 120.966 48.7399 120.093 48.9135C119.22 49.0872 118.316 48.9981 117.493 48.6575C116.671 48.3169 115.968 47.7401 115.474 47.0001C114.979 46.26 114.715 45.39 114.715 44.5V44"
        stroke="#E0FF25"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}