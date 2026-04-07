export type PaddleRuntimeEnvironment = "sandbox" | "production";

function normalizeEnvironment(
    value: string | undefined,
): PaddleRuntimeEnvironment | null {
    if (value === "sandbox" || value === "production") {
        return value;
    }

    return null;
}

export function inferServerPaddleEnvironment(
    apiKey: string | undefined,
    configured: string | undefined,
): PaddleRuntimeEnvironment {
    const configuredEnv = normalizeEnvironment(configured);

    if (!apiKey) {
        return configuredEnv ?? "sandbox";
    }

    const inferredEnv = apiKey.startsWith("pdl_live_")
        ? "production"
        : apiKey.startsWith("pdl_")
          ? "sandbox"
          : null;

    if (!inferredEnv) {
        return configuredEnv ?? "sandbox";
    }

    if (configuredEnv && configuredEnv !== inferredEnv) {
        console.warn(
            `PADDLE_ENVIRONMENT (${configuredEnv}) does not match PADDLE_API_KEY prefix. Using ${inferredEnv}.`,
        );
    }

    return inferredEnv;
}

export function inferClientPaddleEnvironment(
    clientToken: string | undefined,
    configured: string | undefined,
): PaddleRuntimeEnvironment {
    const configuredEnv = normalizeEnvironment(configured);

    if (!clientToken) {
        return configuredEnv ?? "sandbox";
    }

    const inferredEnv = clientToken.startsWith("live_")
        ? "production"
        : clientToken.startsWith("test_")
          ? "sandbox"
          : null;

    if (!inferredEnv) {
        return configuredEnv ?? "sandbox";
    }

    if (configuredEnv && configuredEnv !== inferredEnv) {
        console.warn(
            `NEXT_PUBLIC_PADDLE_ENVIRONMENT (${configuredEnv}) does not match NEXT_PUBLIC_PADDLE_CLIENT_TOKEN prefix. Using ${inferredEnv}.`,
        );
    }

    return inferredEnv;
}