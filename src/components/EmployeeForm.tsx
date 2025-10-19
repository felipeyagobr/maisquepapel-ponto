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
import { EmployeeProfile, EmployeeFormValues as FormValues } from "@/types/employee";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/integrations/supabase/auth";

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
  onSaveSuccess: () => void;
  onClose: () => void;
  initialData?: EmployeeProfile;
}

const EmployeeForm = ({ onSaveSuccess, onClose, initialData }: EmployeeFormProps) => {
  const { session } = useSession();

  const form = useForm<FormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: initialData ? {
      name: `${initialData.first_name || ''} ${initialData.last_name || ''}`.trim(),
      email: initialData.email,
      role: initialData.role,
    } : {
      name: "",
      email: "",
      role: "employee",
    },
  });

  const onSubmit = async (values: FormValues) => {
    const [firstName, ...lastNameParts] = values.name.split(' ');
    const lastName = lastNameParts.join(' ');

    if (!session?.access_token) {
      toast.error("Sessão não encontrada. Por favor, faça login novamente.");
      return;
    }

    const MANAGE_USERS_EDGE_FUNCTION_URL = `https://dpmlhdbqzejijhnabges.supabase.co/functions/v1/manage-users`;

    if (initialData) {
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
      try {
        const response = await fetch(MANAGE_USERS_EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.email,
            first_name: firstName,
            last_name: lastName,
            role: values.role,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao convidar funcionário.');
        }

        toast.success(`Convite enviado para ${values.email}. O funcionário pode definir a senha no primeiro login.`);
        onSaveSuccess();
        onClose();
      } catch (error: any) {
        toast.error("Erro ao convidar funcionário: " + error.message);
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
      {/* Conteúdo simplificado para depuração */}
      <div className="p-4 text-center text-lg font-semibold">
        Formulário de Funcionário (Teste)
      </div>
      <DialogFooter>
        <Button type="button" onClick={onClose}>Fechar</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default EmployeeForm;