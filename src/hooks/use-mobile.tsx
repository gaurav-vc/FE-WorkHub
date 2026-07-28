import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener("resize", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => window.removeEventListener("resize", onChange);
  }, []);

  return !!isMobile;
}
