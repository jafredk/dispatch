export const reviewerEmails = [
  ...(process.env.NEXT_PUBLIC_REVIEWER_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  'jafredjin@gmail.com'
]

export const isReviewerEmail = (email?: string | null) => {
  if (!email) return false
  return reviewerEmails.includes(email.toLowerCase())
}
