"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeProfile, EmployeeFormValues as FormValues } from "@/types/employee"; // Importando os novos tipos
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const employeeFormSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, insira um email válido.",
  }),
  role: z.enum(["employee", "admin"], {
    message: "Por favor, selecione um cargo válido.",
  }),
});

interface EmployeeFormProps {
  onSaveSuccess: () => void; // Callback para quando a operação for bem-sucedida
  onClose: () => void;
  initialData?: EmployeeProfile; // Para edição
}

const EmployeeForm = ({ onSaveSuccess, onClose, initialData }: EmployeeFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: initialData ? {
      name: `${initialData.first_name || ''} ${initialData.last_name || ''}`.trim(),
      email: initialData.email,
      role: initialData.role,
    } : {
      name: "",
      email: "",
      role: "employee", // Default role for new employees
    },
  });

  const onSubmit = async (values: FormValues) => {
    const [firstName, ...lastNameParts] = values.name.split(' ');
    const lastName = lastNameParts.join(' ');

    if (initialData) {
      // Update existing employee profile
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          role: values.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', initialData.id);

      if (error) {
        toast.error("Erro ao atualizar funcionário: " + error.message);
      } else {
        toast.success("Funcionário atualizado com sucesso!");
        onSaveSuccess();
        onClose();
      }
    } else {
      // Invite new user
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(values.email, {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: values.role,
        },
        redirectTo: `${window.location.origin}/login`, // Redirect to login to set password
      });

      if (error) {
        toast.error("Erro ao convidar funcionário: " + error.message);
      } else {
        toast.success(`Convite enviado para ${values.email}. O funcionário pode definir a senha no primeiro login.`);
        onSaveSuccess();
        onClose();
      }
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{initialData ? "Editar Funcionário" : "Adicionar Novo Funcionário"}</DialogTitle>
        <DialogDescription>
          {initialData ? "Faça alterações nos detalhes do funcionário aqui." : "Preencha os detalhes para convidar um novo funcionário."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo do funcionário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@empresa.com" {...field} disabled={!!initialData} /> {/* Email is not editable for existing users */}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="employee">Funcionário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="submit">{initialData ? "Salvar Alterações" : "Convidar Funcionário"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default EmployeeForm;