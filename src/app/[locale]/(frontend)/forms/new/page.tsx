import FormManagementEditor from '@/components/FormManagementEditor'
export default async function NewForm({ searchParams }: { searchParams: Promise<{ returnTo?: string; tab?: string }> }) { const { returnTo, tab } = await searchParams; return <FormManagementEditor returnTo={returnTo} tab={tab} /> }
