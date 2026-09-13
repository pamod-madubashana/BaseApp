import { useCallback, useEffect, useRef, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdaterState =
  | { status: "checking" }
  | { status: "idle" }
  | { status: "available"; version: string }
  | { status: "downloading"; version: string; progress: number | null }
  | { status: "installing"; version: string }
  | { status: "ready"; version: string }
  | { status: "error"; version: string | null; message: string };

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message.trim();
    return message.length > 0 ? message : err.name;
  }
  if (typeof err === "string") {
    const message = err.trim();
    return message.length > 0 ? message : "Unknown error";
  }
  return "Unknown error";
}

const initialState: UpdaterState = { status: "checking" };

function Updater() {
  const [state, setState] = useState<UpdaterState>(initialState);
  const updateRef = useRef<Update | null>(null);

  const runCheck = useCallback(async (cancelled: { value: boolean }): Promise<void> => {
    try {
      const update = await check();
      if (cancelled.value) {
        if (update) {
          await update.close();
        }
        return;
      }
      if (update) {
        updateRef.current = update;
        setState({ status: "available", version: update.version });
      } else {
        setState({ status: "idle" });
      }
    } catch (err) {
      console.error("[updater] check failed:", err);
      if (!cancelled.value) {
        setState({ status: "error", version: null, message: toErrorMessage(err) });
      }
    }
  }, []);

  useEffect(() => {
    const cancelled = { value: false };
    void runCheck(cancelled);

    return () => {
      cancelled.value = true;
      const pending = updateRef.current;
      updateRef.current = null;
      if (pending) {
        void pending.close().catch((err: unknown) => {
          console.debug("[updater] close failed:", err);
        });
      }
    };
  }, [runCheck]);

  const handleUpdate = useCallback(async (): Promise<void> => {
    const update = updateRef.current;
    if (update === null) {
      return;
    }
    const version = update.version;
    setState({ status: "downloading", version, progress: null });

    let contentLength = 0;
    let downloaded = 0;

    const onEvent = (event: DownloadEvent): void => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength ?? 0;
          setState({
            status: "downloading",
            version,
            progress: contentLength > 0 ? 0 : null,
          });
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          setState({
            status: "downloading",
            version,
            progress:
              contentLength > 0
                ? Math.min(100, (downloaded / contentLength) * 100)
                : null,
          });
          break;
        case "Finished":
          setState({ status: "downloading", version, progress: 100 });
          break;
      }
    };

    try {
      await update.downloadAndInstall(onEvent);
      updateRef.current = null;
      setState({ status: "installing", version });
      try {
        await relaunch();
      } catch (relaunchErr) {
        console.error("[updater] relaunch failed:", relaunchErr);
        setState({ status: "ready", version });
      }
    } catch (err) {
      console.error("[updater] download/install failed:", err);
      setState({ status: "error", version, message: toErrorMessage(err) });
    }
  }, []);

  const handleRestart = useCallback(async (version: string): Promise<void> => {
    try {
      await relaunch();
    } catch (err) {
      console.error("[updater] relaunch failed:", err);
      setState({ status: "error", version, message: toErrorMessage(err) });
    }
  }, []);

  const handleRetry = useCallback(async (): Promise<void> => {
    if (state.status !== "error") {
      return;
    }
    if (state.version === null) {
      // Check failed and there is no cached update — re-run the check.
      setState({ status: "checking" });
      await runCheck({ value: false });
      return;
    }
    if (updateRef.current !== null) {
      // Download/install failed and the update is still cached — retry it.
      await handleUpdate();
      return;
    }
    // Relaunch failed after a successful install — retry the relaunch.
    await handleRestart(state.version);
  }, [state, handleUpdate, handleRestart, runCheck]);

  if (state.status === "checking" || state.status === "idle") {
    return null;
  }

  return (
    <div
      className="row"
      style={{
        marginTop: "1rem",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      {state.status === "available" && (
        <button type="button" onClick={() => void handleUpdate()}>
          Update v{state.version} available
        </button>
      )}

      {state.status === "downloading" && (
        <>
          <button type="button" disabled>
            Downloading v{state.version}…
          </button>
          {state.progress === null ? (
            <progress aria-label="Downloading update" />
          ) : (
            <>
              <progress
                value={state.progress}
                max={100}
                aria-label="Update download progress"
                style={{ width: "180px" }}
              />
              <span>{Math.round(state.progress)}%</span>
            </>
          )}
        </>
      )}

      {state.status === "installing" && (
        <>
          <button type="button" disabled>
            Installing v{state.version} — finishing up…
          </button>
          <progress aria-label="Installing update" />
        </>
      )}

      {state.status === "ready" && (
        <>
          <span>Update v{state.version} installed — restart to apply.</span>
          <button type="button" onClick={() => void handleRestart(state.version)}>
            Restart now
          </button>
        </>
      )}

      {state.status === "error" && (
        <>
          <span role="alert">
            Update{state.version !== null ? ` v${state.version}` : ""} failed:{" "}
            {state.message}
          </span>
          <button type="button" onClick={() => void handleRetry()}>
            Retry
          </button>
        </>
      )}
    </div>
  );
}

export default Updater;
