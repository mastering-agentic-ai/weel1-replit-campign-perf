# Social campaign dashboard integration

The standalone dashboard component is exported from `src/dashboard-entry.ts` (and directly from `src/SocialCampaignDashboard.tsx`).

To render it in the application, replace the placeholder home screen body in `src/App.tsx` with:

```tsx
import SocialCampaignDashboard from "./dashboard-entry";

function Home() {
  return <SocialCampaignDashboard />;
}
```

`src/App.tsx` was intentionally left unchanged per request. The application must already wrap this route in the existing `QueryClientProvider`; the dashboard uses the generated `useGetCampaignCsv` hook and its generated query key.
