import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  Key, 
  Lock, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCog
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Permissions() {
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const { toast } = useToast();

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["/api/permissions/roles"],
  });

  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["/api/permissions/list"],
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("/api/permissions/roles", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/roles"] });
      toast({
        title: "Rol creado",
        description: "El rol ha sido creado exitosamente.",
      });
      setIsAddRoleOpen(false);
      setNewRoleName("");
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ roleId, permissionId, enabled }: any) =>
      apiRequest(`/api/permissions/roles/${roleId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissionId, enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/roles"] });
      toast({
        title: "Permiso actualizado",
        description: "El permiso ha sido actualizado exitosamente.",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: any) =>
      apiRequest(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ roleId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado al usuario exitosamente.",
      });
    },
  });

  const getRoleColor = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case "super_admin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "admin": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "employee": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const groupedPermissions = Array.isArray(permissions) 
    ? permissions.reduce((acc: any, permission: any) => {
        const module = permission.module || "General";
        if (!acc[module]) acc[module] = [];
        acc[module].push(permission);
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Permisos</h1>
        <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
          <DialogTrigger asChild>
            <Button>
              <Shield className="mr-2 h-4 w-4" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Rol</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="role-name">Nombre del Rol</Label>
                <Input
                  id="role-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej: Supervisor"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createRoleMutation.mutate(newRoleName)}
                  disabled={!newRoleName.trim() || createRoleMutation.isPending}
                >
                  Crear Rol
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="roles">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.isArray(roles) && roles.map((role: any) => (
              <Card 
                key={role.id} 
                className={`cursor-pointer transition-all ${
                  selectedRole?.id === role.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <Badge className={getRoleColor(role.name)}>
                      {role.name}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {role.userCount || 0} usuarios
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {role.permissionCount || 0} permisos activos
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle>Permisos para: {selectedRole.name}</CardTitle>
                <CardDescription>
                  Configura los permisos específicos para este rol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]: [string, any]) => (
                    <div key={module} className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {module}
                      </h4>
                      <div className="pl-6 space-y-2">
                        {modulePermissions.map((permission: any) => {
                          const isEnabled = selectedRole.permissions?.includes(permission.id);
                          return (
                            <div key={permission.id} className="flex items-center justify-between py-2">
                              <div>
                                <p className="font-medium text-sm">{permission.name}</p>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => {
                                  updatePermissionMutation.mutate({
                                    roleId: selectedRole.id,
                                    permissionId: permission.id,
                                    enabled: checked,
                                  });
                                }}
                                disabled={selectedRole.name === "super_admin"}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Asignación de Roles</CardTitle>
              <CardDescription>
                Gestiona los roles asignados a cada usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-4">Cargando usuarios...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol Actual</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(users) && users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            {user.firstName} {user.lastName}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.roleId?.toString()}
                            onValueChange={(value) => {
                              updateUserRoleMutation.mutate({
                                userId: user.id,
                                roleId: parseInt(value),
                              });
                            }}
                            disabled={user.email === "admin@fourone.com.do"}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.isArray(roles) && roles.map((role: any) => (
                                <SelectItem key={role.id} value={role.id.toString()}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permission Matrix Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Permisos</CardTitle>
          <CardDescription>
            Vista rápida de todos los permisos por rol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Módulo / Permiso
                  </th>
                  {Array.isArray(roles) && roles.map((role: any) => (
                    <th key={role.id} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]: [string, any]) => (
                  <React.Fragment key={module}>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={roles.length + 1} className="px-4 py-2 font-medium text-sm">
                        {module}
                      </td>
                    </tr>
                    {modulePermissions.map((permission: any) => (
                      <tr key={permission.id}>
                        <td className="px-4 py-2 text-sm">{permission.name}</td>
                        {Array.isArray(roles) && roles.map((role: any) => {
                          const hasPermission = role.permissions?.includes(permission.id);
                          return (
                            <td key={role.id} className="px-4 py-2 text-center">
                              {hasPermission ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}