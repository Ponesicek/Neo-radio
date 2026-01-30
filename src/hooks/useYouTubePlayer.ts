import { useCallback, useEffect, useRef, useState } from "react";
import type { SongRowProps } from "../components/Playlist";

const isNewsItem = (
  entry: SongRowProps,
): entry is Extract<SongRowProps, { isSong: false }> => !entry.isSong;

interface YouTubePlayerOptions {
  item: SongRowProps | null;
  upcomingVideoIds?: string[];
  isPlaying: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
}

export function useYouTubePlayer({
  item,
  upcomingVideoIds,
  isPlaying,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onPlayPause,
}: YouTubePlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handledEndRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const isSeekingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const suppressPauseSyncRef = useRef(false);

  const [audioSrc, setAudioSrc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const playbackId = item ? (isNewsItem(item) ? item.newsId : item.videoId) : null;
  const currentVideoId =
    item && !isNewsItem(item) ? item.videoId : null;

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    handledEndRef.current = null;
  }, [playbackId]);

  useEffect(() => {
    setAudioSrc("");
    setCurrentTime(0);
    setDuration(0);
    setSeekValue(0);
    setIsSeeking(false);
    setIsLoading(!!item);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!item) return;

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    let loadPromise: Promise<{ data: ArrayBuffer; mimeType: string }>;
    if (isNewsItem(item)) {
      loadPromise = window.electronAPI.ensureNewsAudio({
        newsId: item.newsId,
        newsText: item.NewsContent,
      });
    } else {
      loadPromise = window.electronAPI.ensureAudio(item.videoId);
    }

    loadPromise
      .then(({ data, mimeType }) => {
        const blob = new Blob([data as ArrayBuffer], {
          type: mimeType || "application/octet-stream",
        });
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled || requestId !== requestIdRef.current) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = objectUrl;
        setAudioSrc(objectUrl);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load audio", error);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (!upcomingVideoIds || upcomingVideoIds.length === 0) return;
    const uniqueIds = Array.from(new Set(upcomingVideoIds)).slice(0, 5);
    uniqueIds.forEach((id) => {
      if (!id || id === currentVideoId) return;
      window.electronAPI.preloadAudio(id).catch(() => { });
    });
  }, [upcomingVideoIds, currentVideoId]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      suppressPauseSyncRef.current = true;
    }
    audio.pause();
    audio.currentTime = 0;

    if (!audioSrc) {
      return;
    }

    audio.load();
  }, [audioSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((error) => {
          console.warn("Audio playback failed", error);
        });
      }
      return;
    }

    audio.pause();
  }, [isPlaying, audioSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const normalizedVolume = Math.min(1, Math.max(0, volume / 100));
    audio.volume = normalizedVolume;
    audio.muted = normalizedVolume === 0;
  }, [volume]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;

    session.setActionHandler("play", () => {
      if (!isPlaying) {
        onPlayPause();
      }
    });
    session.setActionHandler("pause", () => {
      if (isPlaying) {
        onPlayPause();
      }
    });
    session.setActionHandler("nexttrack", canNext ? onNext : null);
    session.setActionHandler("previoustrack", canPrev ? onPrev : null);

    return () => {
      session.setActionHandler("play", null);
      session.setActionHandler("pause", null);
      session.setActionHandler("nexttrack", null);
      session.setActionHandler("previoustrack", null);
    };
  }, [isPlaying, onPlayPause, canNext, onNext, canPrev, onPrev]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    const handleLoadedMetadata = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (nextDuration > 0) {
        setDuration(nextDuration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      if (handledEndRef.current === playbackId) return;
      handledEndRef.current = playbackId;

      if (canNext) {
        onNext();
        return;
      }

      if (isPlaying) {
        onPlayPause();
      }
    };

    const handlePlay = () => {
      if (!isPlaying) {
        onPlayPause();
      }
    };

    const handlePause = () => {
      if (suppressPauseSyncRef.current) {
        suppressPauseSyncRef.current = false;
        return;
      }
      if (audio.ended) return;
      if (isPlaying) {
        onPlayPause();
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleLoadedMetadata);
    audio.addEventListener("canplay", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
    if (!isSeekingRef.current) {
      setCurrentTime(audio.currentTime);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioSrc, playbackId, canNext, onNext, onPlayPause, isPlaying]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  const onSeekValueChange = useCallback(
    (value: number[]) => {
      if (duration <= 0) return;
      setIsSeeking(true);
      setSeekValue(value[0] ?? 0);
    },
    [duration],
  );

  const onSeekCommit = useCallback(
    (value: number[]) => {
      if (duration <= 0) return;
      const nextValue = value[0] ?? 0;
      setIsSeeking(false);
      setSeekValue(nextValue);
      setCurrentTime(nextValue);
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = nextValue;
      }
    },
    [duration],
  );

  const hasDuration = duration > 0;
  const displayTime = isSeeking ? seekValue : currentTime;
  const timelineValue = hasDuration ? Math.min(displayTime, duration) : 0;

  return {
    audioRef,
    audioSrc,
    isLoading,
    volume,
    setVolume,
    duration,
    hasDuration,
    displayTime,
    timelineValue,
    onSeekValueChange,
    onSeekCommit,
  };
}
