export function ArticlePreview({
  title,
  coverImageUrl,
  contentHtml,
}: {
  title: string
  coverImageUrl: string | null
  contentHtml: string
}) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
      {coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImageUrl}
          alt=""
          className="aspect-video w-full rounded-lg border border-border object-cover"
        />
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <div
        className="leading-relaxed text-foreground [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-sm [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-80 [&_img]:my-3 [&_img]:rounded-md [&_img]:border [&_img]:border-border"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  )
}
