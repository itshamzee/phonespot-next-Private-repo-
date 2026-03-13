export function VisaIcon({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="780" height="500" rx="40" fill="#1A1F71" />
      <path d="M357.978 170.098l-52.476 159.681h-55.02l-32.16-127.244c-1.95-7.653-3.645-10.46-9.583-13.697-9.706-5.276-25.724-10.215-39.788-13.281l.955-5.459h88.544c11.284 0 21.439 7.513 24.01 20.519l21.917 116.358 54.147-136.877h54.454zm214.905 107.519c.218-42.095-58.244-44.414-57.837-63.217.131-5.717 5.578-11.803 17.505-13.353 5.914-.773 22.226-1.365 40.731 7.12l7.254-33.84c-9.936-3.612-22.724-7.083-38.644-7.083-40.825 0-69.574 21.694-69.796 52.765-.245 22.986 20.515 35.81 36.164 43.452 16.087 7.823 21.479 12.844 21.411 19.842-.109 10.717-12.82 15.449-24.687 15.632-20.728.329-32.754-5.6-42.337-10.065l-7.469 34.901c9.62 4.428 27.392 8.29 45.813 8.477 43.375 0 71.746-21.427 71.892-54.631zM686.5 329.779h47.923L692.84 170.098h-44.473c-10.005 0-18.437 5.821-22.162 14.773l-78.091 144.908h43.352l8.613-23.847h52.951l5.47 23.847zm-46.011-56.558l21.72-59.895 12.496 59.895h-34.216zM405.422 170.098l-42.924 159.681h-41.295l42.946-159.681h41.273z" fill="#fff" />
    </svg>
  );
}

export function MastercardIcon({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" xmlns="http://www.w3.org/2000/svg">
      <rect width="780" height="500" rx="40" fill="#000" />
      <circle cx="330" cy="250" r="140" fill="#EB001B" />
      <circle cx="450" cy="250" r="140" fill="#F79E1B" />
      <path d="M390 147.5c34.3 27 56.3 68.7 56.3 115.5s-22 88.5-56.3 115.5c-34.3-27-56.3-68.7-56.3-115.5s22-88.5 56.3-115.5z" fill="#FF5F00" />
    </svg>
  );
}

export function MobilePayIcon({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" xmlns="http://www.w3.org/2000/svg">
      <rect width="780" height="500" rx="40" fill="#5A78FF" />
      <path d="M394.5 131.3h-78.8c-5.4 0-10.4 2.9-13 7.6l-128 227.7c-4.2 7.5 1.2 16.8 9.8 16.8h78.8c5.4 0 10.4-2.9 13-7.6l128-227.7c4.2-7.5-1.2-16.8-9.8-16.8z" fill="#fff" />
      <path d="M524.3 131.3h-78.8c-5.4 0-10.4 2.9-13 7.6l-128 227.7c-4.2 7.5 1.2 16.8 9.8 16.8h78.8c5.4 0 10.4-2.9 13-7.6l128-227.7c4.2-7.5-1.2-16.8-9.8-16.8z" fill="#fff" />
    </svg>
  );
}

export function ApplePayIcon({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img
      src="/images/brands/applepay.png"
      alt="Apple Pay"
      className={`${className} rounded-md object-contain`}
    />
  );
}

export function KlarnaIcon({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img
      src="/images/brands/klarna.png"
      alt="Klarna"
      className={`${className} rounded-md object-contain`}
    />
  );
}

export function PaymentIcons({ className = "flex items-center gap-2" }: { className?: string }) {
  return (
    <div className={className}>
      <VisaIcon className="h-7 w-auto rounded" />
      <MastercardIcon className="h-7 w-auto rounded" />
      <MobilePayIcon className="h-7 w-auto rounded" />
      <ApplePayIcon className="h-7 w-auto rounded" />
      <KlarnaIcon className="h-7 w-auto rounded" />
    </div>
  );
}
