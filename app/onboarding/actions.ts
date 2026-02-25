"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseQRString, testConnection, type UntisConfig } from "@/lib/untis";
import { encrypt } from "@/lib/encryption";
import { triggerImmediateSync } from "@/lib/sync";
import { revalidatePath } from "next/cache";

export interface ConnectResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Server action to connect a Untis account from a QR code URI
 * Accepts either a pasted URI string or extracted text from a QR code image
 */
export async function connectUntisAccount(
  formData: FormData
): Promise<ConnectResult> {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const userId = session.user.id;

  // Get the URI from form data (either from text input or file upload)
  const uriString = formData.get("uriString") as string | null;
  const qrTextFromFile = formData.get("qrText") as string | null;

  const uri = uriString || qrTextFromFile;

  console.log('[DEBUG] URI received for parsing:', JSON.stringify(uri));

  if (!uri || uri.trim() === "") {
    return { success: false, error: "Keine URI angegeben" };
  }

  try {
    // Parse the URI to extract configuration
    const parsedConfig = parseQRString(uri.trim());
    console.log('[DEBUG] Parsed config:', JSON.stringify(parsedConfig));
    console.log('[DEBUG] Original URI:', uri.trim());

    // Validate the configuration
    const config: UntisConfig = {
      serverUrl: parsedConfig.serverUrl,
      school: parsedConfig.school,
      username: parsedConfig.username,
      secret: parsedConfig.secret,
      qrCodeUri: uri.trim(), // Pass the original URI for WebUntisQR
    };
    console.log('[DEBUG] Full config:', JSON.stringify(config));

    // Test the connection before saving
    try {
      await testConnection(config);
    } catch (connectionError) {
      console.error("Connection test failed:", connectionError);
      return {
        success: false,
        error:
          connectionError instanceof Error
            ? `Verbindung fehlgeschlagen: ${connectionError.message}`
            : "Verbindung fehlgeschlagen",
      };
    }

    // Encrypt the secret before storing
    const encryptedSecret = encrypt(config.secret);

    // Check if user already has a connection
    const existingConnection = await prisma.untisConnection.findUnique({
      where: { userId },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.untisConnection.update({
        where: { userId },
        data: {
          serverUrl: config.serverUrl,
          school: config.school,
          username: config.username,
          secret: encryptedSecret,
          isActive: true,
        },
      });
    } else {
      // Create new connection
      await prisma.untisConnection.create({
        data: {
          userId,
          serverUrl: config.serverUrl,
          school: config.school,
          username: config.username,
          secret: encryptedSecret,
        },
      });
    }

    // Trigger immediate sync to populate dashboard data right away
    console.log('[connectUntisAccount] Triggering immediate sync...');
    const syncResult = await triggerImmediateSync(userId);
    if (!syncResult.success) {
      console.warn('[connectUntisAccount] Immediate sync failed:', syncResult.error);
      // Don't fail the connection if sync fails - worker will retry
    } else {
      console.log('[connectUntisAccount] Immediate sync completed successfully');
      // Revalidate the dashboard path to ensure fresh data
      revalidatePath('/dashboard');
    }

    return { success: true, message: 'Untis account connected and data synced' };
  } catch (error) {
    console.error("Failed to connect Untis account:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? `Fehler: ${error.message}`
          : "Ein unbekannter Fehler ist aufgetreten",
    };
  }
}

/**
 * Check if the current user has an Untis connection
 */
export async function hasUntisConnection(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const connection = await prisma.untisConnection.findUnique({
    where: { userId: session.user.id },
  });

  return !!connection;
}