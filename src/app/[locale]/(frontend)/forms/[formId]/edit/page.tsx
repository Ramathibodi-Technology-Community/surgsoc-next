import FormManagementEditor from '@/components/FormManagementEditor'
export default async function EditForm({ params, searchParams }: { params: Promise<{ formId: string }>; searchParams: Promise<{ returnTo?: string; tab?: string }> }) { const { returnTo, tab } = await searchParams; return <FormManagementEditor id={(await params).formId} returnTo={returnTo} tab={tab} /> }
