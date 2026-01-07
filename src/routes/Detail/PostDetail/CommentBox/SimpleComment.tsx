import React, { useState, useEffect } from "react"
import styled from "@emotion/styled"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDate } from "src/libs/utils"

type CommentData = {
  id: string
  date: number
  author: string
  content: string
}

type Props = {
  slug: string
}

const SimpleComment: React.FC<Props> = ({ slug }) => {
  const queryClient = useQueryClient()
  const [author, setAuthor] = useState("")
  const [content, setContent] = useState("")
  const [localComments, setLocalComments] = useState<CommentData[]>([])

  // Load locally saved comments on mount (client-side only trick)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`local_comments_${slug}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Filter out comments older than 5 minutes (cache TTL) to avoid eternal duplicates
        const recent = parsed.filter((c: CommentData) => Date.now() - c.date < 1000 * 60 * 5)
        setLocalComments(recent)
      }
    } catch {
      // ignore
    }
  }, [slug])

  const { data: serverComments, isLoading } = useQuery<CommentData[]>({
    queryKey: ["comments", slug],
    queryFn: async () => {
      const res = await fetch(`/api/comments?slug=${slug}`)
      if (!res.ok) throw new Error("Failed to fetch comments")
      return res.json()
    },
    // Keep data fresh but respect quota
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const mutation = useMutation({
    mutationFn: async (newVal: { author: string; content: string }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...newVal }),
      })
      if (!res.ok) throw new Error("Failed to post comment")
      return res.json()
    },
    onSuccess: (newComment) => {
      // 1. Update React Query cache immediately for current session
      queryClient.setQueryData<CommentData[]>(["comments", slug], (old) => {
        return [newComment, ...(old || [])]
      })

      // 2. Save to localStorage for 'fake' persistence across refreshes
      const updatedLocal = [newComment, ...localComments]
      setLocalComments(updatedLocal)
      localStorage.setItem(`local_comments_${slug}`, JSON.stringify(updatedLocal))

      setContent("")
      setAuthor("")
    },
  })

  // Merge server comments and local pending comments
  // Removing duplicates based on ID
  const displayedComments = React.useMemo(() => {
    const combined = [...localComments, ...(serverComments || [])]
    const unique = new Map()
    combined.forEach((c) => {
      if (!unique.has(c.id)) unique.set(c.id, c)
    })
    return Array.from(unique.values()).sort((a, b) => b.date - a.date)
  }, [serverComments, localComments])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    mutation.mutate({ author: author || "Anonymous", content })
  }

  return (
    <StyledWrapper>
      <div className="comment-header">Comments ({displayedComments.length || 0})</div>

      <form onSubmit={handleSubmit} className="comment-form">
        <input
          placeholder="Name (optional)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="input-author"
        />
        <textarea
          placeholder="Leave a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={3}
          className="input-content"
        />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Posting..." : "Post Comment"}
        </button>
      </form>

      <div className="comment-list">
        {isLoading && <div className="loading">Loading comments...</div>}
        {displayedComments.map((c) => (
          <div key={c.id} className="comment-item">
            <div className="meta">
              <span className="author">{c.author}</span>
              <span className="date">{formatDate(c.date, "en-US")}</span>
            </div>
            <div className="body">{c.content}</div>
          </div>
        ))}
      </div>
    </StyledWrapper>
  )
}

export default SimpleComment

const StyledWrapper = styled.div`
  margin-top: 2rem;
  border-top: 1px solid ${({ theme }) => theme.colors.gray6};
  padding-top: 2rem;

  .comment-header {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.colors.gray12};
  }

  .comment-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;

    .input-author,
    .input-content {
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid ${({ theme }) => theme.colors.gray6};
      background: ${({ theme }) => theme.colors.gray3};
      color: ${({ theme }) => theme.colors.gray12};
      font-size: 0.95rem;
      font-family: inherit;
      resize: vertical;

      &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.blue9};
      }
    }

    button {
      align-self: flex-end;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      background: ${({ theme }) => theme.colors.blue9};
      color: white;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      &:hover:not(:disabled) {
        opacity: 0.9;
      }
    }
  }

  .comment-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    .loading {
      color: ${({ theme }) => theme.colors.gray10};
    }

    .comment-item {
      .meta {
        font-size: 0.85rem;
        color: ${({ theme }) => theme.colors.gray10};
        margin-bottom: 0.25rem;
        display: flex;
        gap: 0.5rem;
        align-items: center;

        .author {
          font-weight: 600;
          color: ${({ theme }) => theme.colors.gray12};
        }
      }
      .body {
        font-size: 1rem;
        line-height: 1.6;
        color: ${({ theme }) => theme.colors.gray12};
        white-space: pre-wrap;
      }
    }
  }
`
