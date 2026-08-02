interface LoadingStateProps {
  title?: string;
  text?: string;
}

export function LoadingState({
  title = 'Loading',
  text = 'Please wait while the page is prepared.',
}: LoadingStateProps) {
  return (
    <div className="v2-state" role="status" aria-live="polite">
      <div>
        <p className="v2-state__title">{title}</p>
        <p className="v2-state__text">{text}</p>
      </div>
    </div>
  );
}
