type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!visible) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h2 className="modal-title">{title}</h2>
        <p className="modal-hint">{message}</p>
        <div className="modal-btns">
          <button className="secondary-btn" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={destructive ? 'destructive-btn' : 'primary-btn'}
            onClick={() => { void onConfirm(); }}
            disabled={loading}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
