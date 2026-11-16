import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { postSchema, SPACES, COMMUNITY_LIMITS } from '@kosha/shared';
import { useCreatePost } from '../../api/hooks.js';
import { Button, Dialog, Field, Input, Textarea } from '../../components/ui/primitives.jsx';
import { Dropdown } from '../../components/ui/Dropdown.jsx';
import { useToast } from '../../components/ui/toast.jsx';

const OPTIONS = SPACES.map((s) => ({ value: s.id, label: s.label }));

function PostForm({ defaultSpace, onDone }) {
  const create = useCreatePost();
  const toast = useToast();
  const navigate = useNavigate();
  const { register, handleSubmit, control, watch, formState } = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: { space: defaultSpace ?? 'general', title: '', body: '' },
  });
  const bodyLength = (watch('body') ?? '').length;

  const onSubmit = (values) =>
    create.mutate(values, {
      onSuccess: (post) => {
        toast.success('Posted');
        onDone();
        navigate(`/discussions/${post.id}`);
      },
      onError: (err) => toast.error(err.message),
    });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Space" error={formState.errors.space?.message}>
        {(a11y) => (
          <Controller control={control} name="space" render={({ field }) => <Dropdown {...a11y} value={field.value} onChange={field.onChange} options={OPTIONS} />} />
        )}
      </Field>
      <Field label="Title" error={formState.errors.title?.message}>
        {(a11y) => <Input {...a11y} {...register('title')} maxLength={COMMUNITY_LIMITS.title} placeholder="A question or a topic, in one line" autoFocus />}
      </Field>
      <Field label="Your post" error={formState.errors.body?.message} hint="Posts are opinions, not advice. Don't share personal or financial details.">
        {(a11y) => <Textarea {...a11y} {...register('body')} rows={6} maxLength={COMMUNITY_LIMITS.post} placeholder="Give enough detail for others to help" />}
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className="tabular text-[0.8125rem] text-ink-3">
          {bodyLength}/{COMMUNITY_LIMITS.post}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Post
          </Button>
        </div>
      </div>
    </form>
  );
}

export function NewPostDialog({ open, onClose, defaultSpace }) {
  return (
    <Dialog open={open} onClose={onClose} title="New post" description="Ask a question or share what you have learned." size="lg">
      <PostForm defaultSpace={defaultSpace} onDone={onClose} />
    </Dialog>
  );
}
