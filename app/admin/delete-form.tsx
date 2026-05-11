"use client";

import { useFormStatus } from "react-dom";

interface DeleteFormProps {
    action: (formData: FormData) => void;
    id: string;
    message: string;
}

interface CancelGrantFormProps {
    action: (formData: FormData) => void;
    grantId: string;
    message: string;
}

interface UpdateReferralCodeFormProps {
    action: (formData: FormData) => void;
    codeId: string;
    currentLabel: string;
    currentMaxRedemptions?: number | null;
}

export function DeleteForm({ action, id, message }: DeleteFormProps) {
    const { pending } = useFormStatus();

    return (
        <form
            action={action}
            onSubmit={(e) => {
                if (!confirm(message)) {
                    e.preventDefault();
                }
            }}
        >
            <input type="hidden" name="id" value={id} />
            <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
                Delete
            </button>
        </form>
    );
}

export function CancelGrantForm({ action, grantId, message }: CancelGrantFormProps) {
    const { pending } = useFormStatus();

    return (
        <form
            action={action}
            onSubmit={(e) => {
                if (!confirm(message)) {
                    e.preventDefault();
                }
            }}
        >
            <input type="hidden" name="grantId" value={grantId} />
            <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
                Cancel
            </button>
        </form>
    );
}

export function UpdateReferralCodeForm({ action, codeId, currentLabel, currentMaxRedemptions }: UpdateReferralCodeFormProps) {
    const { pending } = useFormStatus();

    return (
        <form
            action={action}
            className="inline-flex items-center gap-2"
        >
            <input type="hidden" name="codeId" value={codeId} />
            <input
                type="text"
                name="label"
                defaultValue={currentLabel}
                placeholder="Label"
                className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <input
                type="number"
                name="maxRedemptions"
                min={1}
                defaultValue={currentMaxRedemptions ?? ""}
                placeholder="Max uses"
                className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none ring-0 transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
            >
                {pending ? "Saving..." : "Update"}
            </button>
        </form>
    );
}