# Masu Component Library Documentation

## Overview

The Masu component library is built on top of Radix UI primitives and styled with Tailwind CSS. All components are fully typed with TypeScript and follow consistent design patterns.

## Component Categories

### 1. Layout Components

#### ThemeProvider (`components/theme-provider.tsx`)
Provides theme context for the entire application.

**Props:**
```typescript
interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
  themes?: string[]
}
```

**Usage:**
```typescript
import { ThemeProvider } from "@/components/theme-provider"

<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  {children}
</ThemeProvider>
```

### 2. Form Components

#### Button (`components/ui/button.tsx`)
Versatile button component with multiple variants and sizes.

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}
```

**Variants:**
- `default`: Primary button with solid background
- `destructive`: Danger button with red styling
- `outline`: Outlined button with border
- `secondary`: Secondary button with muted styling
- `ghost`: Transparent button with hover effects
- `link`: Link-style button

**Sizes:**
- `default`: Standard size (40px height)
- `sm`: Small size (32px height)
- `lg`: Large size (48px height)
- `icon`: Icon-only button (40px square)

**Example:**
```typescript
import { Button } from "@/components/ui/button"

<Button variant="default" size="lg" onClick={handleClick}>
  Submit
</Button>

<Button variant="outline" size="icon">
  <Plus className="h-4 w-4" />
</Button>
```

#### Input (`components/ui/input.tsx`)
Text input component with consistent styling.

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
```

**Example:**
```typescript
import { Input } from "@/components/ui/input"

<Input 
  type="email" 
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

#### Textarea (`components/ui/textarea.tsx`)
Multi-line text input component.

**Props:**
```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
```

**Example:**
```typescript
import { Textarea } from "@/components/ui/textarea"

<Textarea 
  placeholder="Enter your message"
  rows={4}
  value={message}
  onChange={(e) => setMessage(e.target.value)}
/>
```

#### Label (`components/ui/label.tsx`)
Accessible label component.

**Props:**
```typescript
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
```

**Example:**
```typescript
import { Label } from "@/components/ui/label"

<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

#### Select (`components/ui/select.tsx`)
Select dropdown component with search functionality.

**Props:**
```typescript
interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  disabled?: boolean
  children: React.ReactNode
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
  position?: "popper" | "item"
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  alignOffset?: number
  avoidCollisions?: boolean
  collisionBoundary?: Boundary
  collisionPadding?: number | Partial<Record<Side, number>>
  arrowPadding?: number
  sticky?: "always" | "partial" | "never"
  hideWhenDetached?: boolean
  updatePositionStrategy?: "optimized" | "always"
  onPlaced?: () => void
  loop?: boolean
  onCloseAutoFocus?: (event: Event) => void
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void
  onFocusOutside?: (event: FocusOutsideEvent) => void
  onInteractOutside?: (event: InteractOutsideEvent) => void
  onOpenAutoFocus?: (event: Event) => void
  onKeyDown?: (event: KeyboardEvent) => void
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  disabled?: boolean
  children: React.ReactNode
}
```

**Example:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

#### Checkbox (`components/ui/checkbox.tsx`)
Checkbox input component.

**Props:**
```typescript
interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {}
```

**Example:**
```typescript
import { Checkbox } from "@/components/ui/checkbox"

<Checkbox 
  checked={isChecked}
  onCheckedChange={setIsChecked}
/>
```

#### RadioGroup (`components/ui/radio-group.tsx`)
Radio button group component.

**Props:**
```typescript
interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {}

interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {}
```

**Example:**
```typescript
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

<RadioGroup value={selectedValue} onValueChange={setSelectedValue}>
  <RadioGroupItem value="option1" id="option1" />
  <Label htmlFor="option1">Option 1</Label>
  
  <RadioGroupItem value="option2" id="option2" />
  <Label htmlFor="option2">Option 2</Label>
</RadioGroup>
```

#### Switch (`components/ui/switch.tsx`)
Toggle switch component.

**Props:**
```typescript
interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {}
```

**Example:**
```typescript
import { Switch } from "@/components/ui/switch"

<Switch 
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
/>
```

#### Form (`components/ui/form.tsx`)
Form component with React Hook Form integration.

**Props:**
```typescript
interface FormProps<TData, TValues> {
  form: UseFormReturn<TData, TValues>
  children: React.ReactNode
}

interface FormFieldProps<TData, TValues> {
  control: Control<TData, TValues>
  name: FieldPath<TData>
  render: (props: { field: ControllerFieldState; fieldState: ControllerFieldState; formState: FormState<TData> }) => React.ReactElement
}

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {}

interface FormControlProps extends React.ComponentPropsWithoutRef<typeof Slot> {}

interface FormDescriptionProps extends React.ComponentPropsWithoutRef<typeof Slot> {}

interface FormMessageProps extends React.ComponentPropsWithoutRef<typeof Slot> {}
```

**Example:**
```typescript
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"

const form = useForm()

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### 3. Overlay Components

#### Dialog (`components/ui/dialog.tsx`)
Modal dialog component.

**Props:**
```typescript
interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

interface DialogTriggerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {}

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {}

interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {}
```

**Example:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <p>Dialog content goes here</p>
  </DialogContent>
</Dialog>
```

#### Popover (`components/ui/popover.tsx`)
Popover component for contextual information.

**Props:**
```typescript
interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

interface PopoverTriggerProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {}

interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}
```

**Example:**
```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

<Popover>
  <PopoverTrigger asChild>
    <Button>Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <p>Popover content goes here</p>
  </PopoverContent>
</Popover>
```

#### Tooltip (`components/ui/tooltip.tsx`)
Tooltip component for additional information.

**Props:**
```typescript
interface TooltipProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  disableHoverableContent?: boolean
}

interface TooltipTriggerProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> {}

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {}
```

**Example:**
```typescript
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

<Tooltip>
  <TooltipTrigger asChild>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Additional information</p>
  </TooltipContent>
</Tooltip>
```

#### AlertDialog (`components/ui/alert-dialog.tsx`)
Alert dialog for confirmations and warnings.

**Props:**
```typescript
interface AlertDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface AlertDialogTriggerProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger> {}

interface AlertDialogContentProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {}

interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

interface AlertDialogTitleProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> {}

interface AlertDialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> {}

interface AlertDialogActionProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> {}

interface AlertDialogCancelProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> {}
```

**Example:**
```typescript
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Account</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Sheet (`components/ui/sheet.tsx`)
Side panel component.

**Props:**
```typescript
interface SheetProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

interface SheetTriggerProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger> {}

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: "top" | "right" | "bottom" | "left"
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

interface SheetTitleProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title> {}

interface SheetDescriptionProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description> {}
```

**Example:**
```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger asChild>
    <Button>Open Sheet</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
    </SheetHeader>
    <p>Sheet content goes here</p>
  </SheetContent>
</Sheet>
```

#### Drawer (`components/ui/drawer.tsx`)
Drawer component for mobile navigation.

**Props:**
```typescript
interface DrawerProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

interface DrawerTriggerProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Trigger> {}

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  side?: "top" | "right" | "bottom" | "left"
}

interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

interface DrawerTitleProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title> {}

interface DrawerDescriptionProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description> {}
```

### 4. Navigation Components

#### NavigationMenu (`components/ui/navigation-menu.tsx`)
Navigation menu component with dropdown support.

**Props:**
```typescript
interface NavigationMenuProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> {}

interface NavigationMenuListProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List> {}

interface NavigationMenuItemProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item> {}

interface NavigationMenuTriggerProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger> {}

interface NavigationMenuContentProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content> {}

interface NavigationMenuLinkProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link> {}

interface NavigationMenuIndicatorProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator> {}

interface NavigationMenuViewportProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport> {}
```

#### Menubar (`components/ui/menubar.tsx`)
Menu bar component for application menus.

**Props:**
```typescript
interface MenubarProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root> {}

interface MenubarTriggerProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger> {}

interface MenubarContentProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content> {}

interface MenubarItemProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> {}

interface MenubarCheckboxItemProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem> {}

interface MenubarRadioItemProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem> {}

interface MenubarLabelProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> {}

interface MenubarSeparatorProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator> {}

interface MenubarShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

interface MenubarSubProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Sub> {}

interface MenubarSubTriggerProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> {}

interface MenubarSubContentProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent> {}

interface MenubarGroupProps extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Group> {}
```

#### Tabs (`components/ui/tabs.tsx`)
Tab component for organizing content.

**Props:**
```typescript
interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {}

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {}

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {}

interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {}
```

**Example:**
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    Account settings content
  </TabsContent>
  <TabsContent value="password">
    Password settings content
  </TabsContent>
</Tabs>
```

### 5. Data Display Components

#### Table (`components/ui/table.tsx`)
Data table component with sorting and pagination support.

**Props:**
```typescript
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

interface TableHeaderProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableDataCellElement> {}

interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}
```

**Example:**
```typescript
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

<Table>
  <TableCaption>A list of your recent invoices.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Method</TableHead>
      <TableHead>Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>Credit Card</TableCell>
      <TableCell>$250.00</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Card (`components/ui/card.tsx`)
Card container component for grouping related content.

**Props:**
```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
```

**Example:**
```typescript
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <p>Card footer</p>
  </CardFooter>
</Card>
```

#### Badge (`components/ui/badge.tsx`)
Badge component for status indicators and labels.

**Props:**
```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}
```

**Variants:**
- `default`: Primary badge
- `secondary`: Secondary badge
- `destructive`: Danger badge
- `outline`: Outlined badge

**Example:**
```typescript
import { Badge } from "@/components/ui/badge"

<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

#### Avatar (`components/ui/avatar.tsx`)
Avatar component for user profile pictures.

**Props:**
```typescript
interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {}

interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}

interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}
```

**Example:**
```typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="/avatars/01.png" alt="@username" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>
```

#### Progress (`components/ui/progress.tsx`)
Progress bar component.

**Props:**
```typescript
interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {}
```

**Example:**
```typescript
import { Progress } from "@/components/ui/progress"

<Progress value={33} />
```

#### Slider (`components/ui/slider.tsx`)
Slider component for range selection.

**Props:**
```typescript
interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {}
```

**Example:**
```typescript
import { Slider } from "@/components/ui/slider"

<Slider defaultValue={[33]} max={100} step={1} />
```

### 6. Feedback Components

#### Toast (`components/ui/toast.tsx`)
Toast notification component.

**Props:**
```typescript
interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {}

interface ToastActionElementProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action> {}

interface ToastCloseProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close> {}

interface ToastDescriptionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description> {}

interface ToastTitleProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title> {}

interface ToastViewportProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport> {}
```

**Example:**
```typescript
import { Toast, ToastAction, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

function ToastDemo() {
  const { toast } = useToast()

  return (
    <Button
      onClick={() => {
        toast({
          title: "Scheduled: Catch up",
          description: "Friday, February 10, 2023 at 3:00 PM",
        })
      }}
    >
      Add to calendar
    </Button>
  )
}
```

#### Alert (`components/ui/alert.tsx`)
Alert component for important messages.

**Props:**
```typescript
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {}

interface AlertTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
```

**Example:**
```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>
```

### 7. Utility Components

#### Separator (`components/ui/separator.tsx`)
Visual separator component.

**Props:**
```typescript
interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  decorative?: boolean
  orientation?: "horizontal" | "vertical"
}
```

**Example:**
```typescript
import { Separator } from "@/components/ui/separator"

<div>
  <div>Content above</div>
  <Separator />
  <div>Content below</div>
</div>
```

#### ScrollArea (`components/ui/scroll-area.tsx`)
Custom scrollable area component.

**Props:**
```typescript
interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {}

interface ScrollBarProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {}

interface ScrollAreaViewportProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaViewport> {}

interface ScrollAreaCornerProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaCorner> {}
```

**Example:**
```typescript
import { ScrollArea } from "@/components/ui/scroll-area"

<ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
  <div className="space-y-4">
    <h4 className="text-sm font-medium leading-none">Tags</h4>
    <div className="text-sm text-muted-foreground">
      Scrollable content goes here
    </div>
  </div>
</ScrollArea>
```

#### AspectRatio (`components/ui/aspect-ratio.tsx`)
Aspect ratio container component.

**Props:**
```typescript
interface AspectRatioProps extends React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> {
  ratio?: number
}
```

**Example:**
```typescript
import { AspectRatio } from "@/components/ui/aspect-ratio"

<AspectRatio ratio={16 / 9} className="bg-muted">
  <img
    src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
    alt="Photo"
    className="rounded-md object-cover"
  />
</AspectRatio>
```

#### Collapsible (`components/ui/collapsible.tsx`)
Collapsible content component.

**Props:**
```typescript
interface CollapsibleProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> {}

interface CollapsibleTriggerProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> {}

interface CollapsibleContentProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> {}
```

**Example:**
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

<Collapsible>
  <CollapsibleTrigger>Can I use this in my project?</CollapsibleTrigger>
  <CollapsibleContent>
    Yes. Free to use for personal and commercial projects. No attribution required.
  </CollapsibleContent>
</Collapsible>
```

#### Accordion (`components/ui/accordion.tsx`)
Accordion component for expandable content.

**Props:**
```typescript
interface AccordionProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> {
  type?: "single" | "multiple"
  collapsible?: boolean
}

interface AccordionItemProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
  value: string
}

interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {}

interface AccordionContentProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {}
```

**Example:**
```typescript
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>
      Yes. It adheres to the WAI-ARIA design pattern.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### 8. Advanced Components

#### Command (`components/ui/command.tsx`)
Command palette component for search and navigation.

**Props:**
```typescript
interface CommandProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive> {}

interface CommandInputProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {}

interface CommandListProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.List> {}

interface CommandEmptyProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty> {}

interface CommandGroupProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group> {}

interface CommandSeparatorProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator> {}

interface CommandItemProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> {}

interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

interface CommandDialogProps extends DialogProps {}
```

#### ContextMenu (`components/ui/context-menu.tsx`)
Context menu component for right-click actions.

**Props:**
```typescript
interface ContextMenuProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Root> {}

interface ContextMenuTriggerProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger> {}

interface ContextMenuContentProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content> {}

interface ContextMenuItemProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> {}

interface ContextMenuCheckboxItemProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem> {}

interface ContextMenuRadioItemProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem> {}

interface ContextMenuLabelProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> {}

interface ContextMenuSeparatorProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator> {}

interface ContextMenuShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

interface ContextMenuSubProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Sub> {}

interface ContextMenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> {}

interface ContextMenuSubContentProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent> {}

interface ContextMenuGroupProps extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group> {}
```

#### HoverCard (`components/ui/hover-card.tsx`)
Hover card component for additional information on hover.

**Props:**
```typescript
interface HoverCardProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  openDelay?: number
  closeDelay?: number
}

interface HoverCardTriggerProps extends React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger> {}

interface HoverCardContentProps extends React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> {}
```

#### DropdownMenu (`components/ui/dropdown-menu.tsx`)
Dropdown menu component.

**Props:**
```typescript
interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

interface DropdownMenuTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {}

interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {}

interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {}

interface DropdownMenuCheckboxItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {}

interface DropdownMenuRadioItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> {}

interface DropdownMenuLabelProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {}

interface DropdownMenuSeparatorProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {}

interface DropdownMenuShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

interface DropdownMenuSubProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Sub> {}

interface DropdownMenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {}

interface DropdownMenuSubContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> {}

interface DropdownMenuGroupProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group> {}
```

#### Toggle (`components/ui/toggle.tsx`)
Toggle button component.

**Props:**
```typescript
interface ToggleProps extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {
  size?: "default" | "sm" | "lg"
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}
```

#### ToggleGroup (`components/ui/toggle-group.tsx`)
Toggle group component for multiple toggles.

**Props:**
```typescript
interface ToggleGroupProps extends React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> {
  type?: "single" | "multiple"
}

interface ToggleGroupItemProps extends React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> {
  value: string
  size?: "default" | "sm" | "lg"
}
```

#### InputOTP (`components/ui/input-otp.tsx`)
One-time password input component.

**Props:**
```typescript
interface InputOTPProps extends React.ComponentPropsWithoutRef<typeof InputOTPPrimitive.Root> {
  maxLength?: number
  value?: string
  onChange?: (value: string) => void
}

interface InputOTPGroupProps extends React.ComponentPropsWithoutRef<typeof InputOTPPrimitive.Group> {}

interface InputOTPSlotProps extends React.ComponentPropsWithoutRef<typeof InputOTPPrimitive.Slot> {
  char?: string
  hasFakeCaret?: boolean
}
```

#### Resizable (`components/ui/resizable.tsx`)
Resizable panel component.

**Props:**
```typescript
interface ResizableProps extends React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Root> {
  direction?: "horizontal" | "vertical"
  onLayout?: (sizes: number[]) => void
}

interface ResizableHandleProps extends React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Handle> {
  withHandle?: boolean
}

interface ResizablePanelProps extends React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Panel> {
  defaultSize?: number
  minSize?: number
  maxSize?: number
  order?: number
  id?: string
}
```

#### Skeleton (`components/ui/skeleton.tsx`)
Skeleton loading component.

**Props:**
```typescript
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}
```

**Example:**
```typescript
import { Skeleton } from "@/components/ui/skeleton"

<div className="flex items-center space-x-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
</div>
```

## Styling and Theming

### CSS Variables
The component library uses CSS variables for consistent theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

### Dark Mode
Dark mode is supported through CSS variables:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

## Best Practices

### 1. Accessibility
- All components follow WAI-ARIA guidelines
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### 2. Performance
- Lazy loading for heavy components
- Memoization where appropriate
- Efficient re-renders

### 3. TypeScript
- Full type safety
- IntelliSense support
- Compile-time error checking

### 4. Customization
- CSS variables for theming
- Tailwind CSS classes for styling
- Component composition patterns

### 5. Responsive Design
- Mobile-first approach
- Flexible layouts
- Touch-friendly interactions

## Usage Guidelines

### 1. Import Components
Always import components from the UI directory:

```typescript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
```

### 2. Use Consistent Patterns
Follow established patterns for similar components:

```typescript
// Good
<Button variant="default" size="lg">
  Click me
</Button>

// Good
<Input placeholder="Enter text" />
```

### 3. Handle States
Always handle loading, error, and empty states:

```typescript
{isLoading ? (
  <Skeleton className="h-10 w-full" />
) : error ? (
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
) : (
  <div>Content</div>
)}
```

### 4. Form Validation
Use React Hook Form with Zod for form validation:

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const schema = z.object({
  email: z.string().email(),
})

const form = useForm({
  resolver: zodResolver(schema),
})
```

### 5. Error Boundaries
Wrap components in error boundaries for production:

```typescript
import { ErrorBoundary } from "react-error-boundary"

<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <MyComponent />
</ErrorBoundary>
```

## Contributing

When adding new components:

1. Follow the existing patterns
2. Include TypeScript types
3. Add accessibility features
4. Write documentation
5. Include examples
6. Test thoroughly

---

*This documentation covers all UI components in the Masu component library. For more specific usage examples, refer to the source code and inline documentation.*