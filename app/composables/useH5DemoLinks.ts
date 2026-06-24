import { H5_DEMO_ENTRIES, resolveH5DemoHref, type H5DemoEntry } from '~/utils/h5-demo-urls'

export function useH5DemoLinks() {
  const requestURL = useRequestURL()

  const origin = computed(() => `${requestURL.protocol}//${requestURL.host}`)

  const demos = computed(() =>
    H5_DEMO_ENTRIES.map((entry) => ({
      ...entry,
      href: resolveH5DemoHref(entry, origin.value),
    })),
  )

  function hrefFor(entry: H5DemoEntry): string {
    return resolveH5DemoHref(entry, origin.value)
  }

  return { demos, hrefFor }
}
