export function LoadingAlert({ message }) {
  return (
    <div>
      <p role="alert" className="pb-10 text-xl">
        {message}
      </p>
      <div className="text-center" aria-hidden="true">
        {[0, 300, 600].map((delay) => (
          <div
            key={delay}
            className={`w-8 h-8 mx-1.5 rounded-full bg-blue-300 inline-block animate-pulse ${`animate-delay-${delay}`}`}
          ></div>
        ))}
      </div>
    </div>
  );
}
